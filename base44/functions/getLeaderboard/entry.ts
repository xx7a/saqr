import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public leaderboard endpoint — no auth required.
// Source of truth for points: User.lab_points field (updated by awardLabPoints and admin).
// LabReward records used for labs_completed count and first_award_date tie-breaker.
// Supports manual Top 3 pinning via LeaderboardPin entity (admin-only).
// Pinned positions take priority; unpinned positions auto-fill from highest points.
// Excludes: admins, test accounts. Respects hide_public_identity (returns hide_identity flag).
//
// Params: limit (default 50), offset (default 0), current_user_id (optional), top (3 = top 3 only)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      body = await req.json();
    } catch {
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { body[k] = v; });
    }
    const limit = Math.min(parseInt(body.limit || '50'), 200);
    const offset = parseInt(body.offset || '0');
    const currentUserId = body.current_user_id || '';
    const topOnly = body.top === '3' || body.top === 3 || body.top === true;

    // 1. Get all users (service role bypasses RLS)
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const userById = {};
    for (const u of users) userById[u.id] = u;

    // 2. Get LabReward data for labs_completed count and first_award_date (tie-breaker)
    const allRewards = await base44.asServiceRole.entities.LabReward.list('-awarded_date', 2000);
    const rewardMap = {};
    for (const r of allRewards) {
      if (!rewardMap[r.user_id]) {
        rewardMap[r.user_id] = { labsCount: 0, firstAwardDate: r.awarded_date };
      }
      rewardMap[r.user_id].labsCount += 1;
      if (r.awarded_date && (!rewardMap[r.user_id].firstAwardDate || r.awarded_date < rewardMap[r.user_id].firstAwardDate)) {
        rewardMap[r.user_id].firstAwardDate = r.awarded_date;
      }
    }

    // 3. Get manual pins for Top 3
    let pinMap = {}; // position -> user_id
    try {
      const pins = await base44.asServiceRole.entities.LeaderboardPin.list('position', 10);
      for (const p of pins) {
        if (p.position >= 1 && p.position <= 3) {
          pinMap[p.position] = p.user_id;
        }
      }
    } catch {
      // LeaderboardPin entity might not exist yet — continue without pins
    }

    // 4. Build all entries from users with lab_points > 0
    const allEntries = [];
    for (const u of users) {
      if (u.role === 'admin') continue;
      if (u.is_test_account) continue;
      if (u.excluded_from_leaderboard === true) continue;
      const points = u.lab_points || 0;
      if (points <= 0) continue;

      const rewardData = rewardMap[u.id] || {};
      const hideIdentity = u.hide_public_identity === true;

      allEntries.push({
        user_id: u.id,
        display_name: hideIdentity ? '' : (u.display_name || u.full_name || ''),
        avatar_url: hideIdentity ? '' : (u.avatar_url || ''),
        lab_points: points,
        labs_completed: rewardData.labsCount || 0,
        first_award_date: rewardData.firstAwardDate || u.created_date,
        hide_identity: hideIdentity,
        is_pinned: false,
      });
    }

    // 5. Sort: points desc, then first_award_date asc (earlier reaches that score first)
    allEntries.sort((a, b) => {
      if (b.lab_points !== a.lab_points) return b.lab_points - a.lab_points;
      const dateA = a.first_award_date ? new Date(a.first_award_date).getTime() : 0;
      const dateB = b.first_award_date ? new Date(b.first_award_date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return a.user_id.localeCompare(b.user_id);
    });

    // 6. Apply manual pins for positions 1-3
    const pinnedUserIds = new Set(Object.values(pinMap));
    const autoEntries = allEntries.filter(e => !pinnedUserIds.has(e.user_id));
    const placedUserIds = new Set();

    const finalLeaderboard = [];

    for (let pos = 1; pos <= 3; pos++) {
      const pinnedUserId = pinMap[pos];
      if (pinnedUserId && !placedUserIds.has(pinnedUserId)) {
        const u = userById[pinnedUserId];
        if (u && u.role !== 'admin' && !u.is_test_account && u.excluded_from_leaderboard !== true) {
          const existingEntry = allEntries.find(e => e.user_id === pinnedUserId);
          if (existingEntry) {
            finalLeaderboard.push({ ...existingEntry, rank: pos, is_pinned: true });
          } else {
            // User with 0 points but pinned by admin
            const hideIdentity = u.hide_public_identity === true;
            const rewardData = rewardMap[pinnedUserId] || {};
            finalLeaderboard.push({
              user_id: pinnedUserId,
              display_name: hideIdentity ? '' : (u.display_name || u.full_name || ''),
              avatar_url: hideIdentity ? '' : (u.avatar_url || ''),
              lab_points: u.lab_points || 0,
              labs_completed: rewardData.labsCount || 0,
              first_award_date: rewardData.firstAwardDate || u.created_date,
              hide_identity: hideIdentity,
              rank: pos,
              is_pinned: true,
            });
          }
          placedUserIds.add(pinnedUserId);
          continue;
        }
      }
      // No valid pin for this position — fill from auto entries
      if (autoEntries.length > 0) {
        const next = autoEntries.shift();
        placedUserIds.add(next.user_id);
        finalLeaderboard.push({ ...next, rank: pos });
      }
    }

    // Add remaining auto entries with ranks 4+
    let rankCounter = 4;
    for (const e of autoEntries) {
      finalLeaderboard.push({ ...e, rank: rankCounter++ });
    }

    const total = finalLeaderboard.length;

    // 7. Find current user's rank
    let currentUserRank = null;
    if (currentUserId) {
      const found = finalLeaderboard.find(e => e.user_id === currentUserId);
      if (found) {
        currentUserRank = {
          rank: found.rank,
          display_name: found.display_name,
          avatar_url: found.avatar_url,
          lab_points: found.lab_points,
          labs_completed: found.labs_completed,
          hide_identity: found.hide_identity,
        };
      } else {
        const cu = userById[currentUserId];
        if (cu && cu.role !== 'admin' && !cu.is_test_account) {
          const hideIdentity = cu.hide_public_identity === true;
          currentUserRank = {
            rank: null,
            display_name: hideIdentity ? '' : (cu.display_name || cu.full_name || ''),
            avatar_url: hideIdentity ? '' : (cu.avatar_url || ''),
            lab_points: cu.lab_points || 0,
            labs_completed: (rewardMap[currentUserId] || {}).labsCount || 0,
            hide_identity: hideIdentity,
          };
        }
      }
    }

    // 8. Paginate
    const paginated = topOnly ? finalLeaderboard.slice(0, 3) : finalLeaderboard.slice(offset, offset + limit);

    return Response.json({ leaderboard: paginated, total, current_user_rank: currentUserRank });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}