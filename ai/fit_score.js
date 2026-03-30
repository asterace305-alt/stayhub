// ============================================================
//  StayHub — PG/Hostel Fit-Score Algorithm
//  utils/scoringEngine.js
// ============================================================

/**
 * Generate weights from the user's priority ranking.
 *
 * @param {string[]} priorityOrder - e.g. ['food', 'distance', 'budget', 'curfew', 'wifi']
 *   Must contain exactly these 5 strings in the order of importance (index 0 = most important).
 * @returns {Object} - { budget: 0.25, distance: 0.18, food: 0.30, wifi: 0.07, curfew: 0.10, verified: 0.10 }
 */
function generateWeights(priorityOrder) {
    const shares = [0.30, 0.25, 0.18, 0.10, 0.07]; // rank #1 → #5
    const weights = {};

    priorityOrder.forEach((factor, index) => {
        weights[factor] = shares[index];
    });

    weights.verified = 0.10; // always fixed at 10%
    return weights;
}

/**
 * Calculate the fit score for a single PG against a student's preferences.
 *
 * @param {Object} studentPrefs - Student's preferences
 *   {
 *     budget: 8000,               // max monthly rent (₹)
 *     max_distance: 2.0,          // max acceptable distance in km
 *     needs_food: true,           // does the student need food included?
 *     curfew: 'no_curfew',        // 'strict' | 'moderate' | 'no_curfew'
 *     gender: 'female',           // 'male' | 'female' — used for pre-filtering only
 *     priorities: ['food', 'budget', 'distance', 'curfew', 'wifi']  // ranked #1 → #5
 *   }
 *
 * @param {Object} pg - PG/Hostel data
 *   {
 *     name: 'Sunshine PG',
 *     area: 'Katraj',
 *     rent: 7000,
 *     food: true,                 // food included?
 *     wifi: true,                 // high-speed wifi available?
 *     curfew: 'no_curfew',        // 'strict' | 'moderate' | 'no_curfew'
 *     occupantType: 'female',     // 'male' | 'female' | 'unisex'
 *     distance_bibwewadi: 1.2,    // km from Bibwewadi campus
 *     distance_kondhwa: 2.5,      // km from Kondhwa campus
 *     tier: 'verified',           // 'premium' | 'verified' | 'basic'
 *   }
 *
 * @param {string} campus - 'bibwewadi' | 'kondhwa'
 *
 * @returns {{ score: number, breakdown: Object, issues: string[] }}
 */
function calculateFitScore(studentPrefs, pg, campus) {

    // ──────────────────────────────────────────────
    //  1. BUDGET SCORE
    //     Within budget → 1.0
    //     Over budget → decays linearly to 0
    // ──────────────────────────────────────────────
    let b_score;
    if (pg.rent <= studentPrefs.budget) {
        b_score = 1.0;
    } else {
        const extra = pg.rent - studentPrefs.budget;
        b_score = 1 - (extra / studentPrefs.budget);
        if (b_score < 0) b_score = 0;
    }

    // ──────────────────────────────────────────────
    //  2. DISTANCE SCORE  (Exponential Decay)
    //
    //     Formula:  d_score = e^(-k × distance)
    //     where k  = ln(5) / max_distance
    //
    //     This gives:
    //       0 km       → 100%
    //       0.5 km     →  67%
    //       1.0 km     →  45%
    //       max_dist   →  20%   (still viable, NOT zero)
    //       beyond     →  gracefully → 0
    //
    //     Why not linear?
    //       Linear (1 - d/max) gives 0% at max distance,
    //       which is absurd — 2 km is totally walkable.
    // ──────────────────────────────────────────────
    const distance = (campus === 'bibwewadi')
        ? pg.distance_bibwewadi
        : pg.distance_kondhwa;

    const k = Math.log(5) / studentPrefs.max_distance;
    const d_score = Math.exp(-k * distance);

    // ──────────────────────────────────────────────
    //  3. FOOD SCORE (boolean match)
    //     Needs food + PG has food     → 1.0
    //     Needs food + PG has NO food  → 0.0
    //     No need    + PG has food     → 0.3  (penalize extra cost)
    //     No need    + PG has NO food  → 1.0
    // ──────────────────────────────────────────────
    let f_score;
    if (studentPrefs.needs_food) {
        f_score = pg.food ? 1.0 : 0.0;
    } else {
        f_score = pg.food ? 0.3 : 1.0;
    }

    // ──────────────────────────────────────────────
    //  4. WIFI SCORE (boolean)
    //     High-speed available → 1.0
    //     Not available        → 0.3
    // ──────────────────────────────────────────────
    const w_score = pg.wifi ? 1.0 : 0.3;

    // ──────────────────────────────────────────────
    //  5. CURFEW SCORE (preference match)
    //     Exact match           → 1.0
    //     Moderate (middle)     → 0.5
    //     Complete mismatch     → 0.2
    // ──────────────────────────────────────────────
    let c_score;
    if (studentPrefs.curfew === pg.curfew) {
        c_score = 1.0;
    } else if (pg.curfew === 'moderate') {
        c_score = 0.5;   // moderate is the "middle ground" — partial match
    } else {
        c_score = 0.2;   // strict ↔ no_curfew = full mismatch
    }

    // ──────────────────────────────────────────────
    //  6. VERIFICATION TIER (always 10% weight)
    //     premium   → 1.0
    //     verified  → 0.75
    //     basic     → 0.3
    // ──────────────────────────────────────────────
    const tierMap = { premium: 1.0, verified: 0.75, basic: 0.3 };
    const v_score = tierMap[pg.tier] || 0.3;

    // ──────────────────────────────────────────────
    //  WEIGHTED COMBINATION
    //  Weights come from user's priority ranking
    // ──────────────────────────────────────────────
    const weights = generateWeights(studentPrefs.priorities);

    const scoreMap = {
        budget:   b_score,
        distance: d_score,
        food:     f_score,
        wifi:     w_score,
        curfew:   c_score,
        verified: v_score,
    };

    let finalScore = 0;
    for (const [factor, weight] of Object.entries(weights)) {
        finalScore += weight * scoreMap[factor];
    }
    finalScore = Math.round(finalScore * 100);

    // ──────────────────────────────────────────────
    //  BREAKDOWN (for frontend display)
    // ──────────────────────────────────────────────
    const breakdown = {};
    for (const [factor, val] of Object.entries(scoreMap)) {
        breakdown[factor] = Math.round(val * 100);
    }

    // ──────────────────────────────────────────────
    //  ISSUES (warnings shown to user)
    // ──────────────────────────────────────────────
    const issues = [];
    if (f_score === 0)    issues.push('Food not available');
    if (b_score < 0.9)    issues.push(`Rent ₹${pg.rent} exceeds budget ₹${studentPrefs.budget}`);
    if (d_score < 0.3)    issues.push(`Distance ${distance.toFixed(1)}km is quite far`);
    if (v_score < 0.5)    issues.push('PG is not verified');
    if (c_score < 0.5)    issues.push('Curfew policy mismatch');

    return { score: finalScore, breakdown, issues };
}

/**
 * Rank all PGs for a student.
 * Pre-filters by gender, then scores and sorts.
 *
 * @param {Object}   studentPrefs - Student preferences (see above)
 * @param {Object[]} allPGs       - Array of PG objects
 * @param {string}   campus       - 'bibwewadi' | 'kondhwa'
 * @returns {Object[]} - Sorted array of { pg, score, breakdown, issues }
 */
function rankPGs(studentPrefs, allPGs, campus) {

    // Step 1: Filter out gender-incompatible PGs
    const compatible = allPGs.filter(pg => {
        if (pg.occupantType === 'unisex') return true;
        return pg.occupantType === studentPrefs.gender;
    });

    // Step 2: Filter out PGs with rent > 2x budget (extreme mismatch)
    const affordable = compatible.filter(pg => {
        return pg.rent <= studentPrefs.budget * 2;
    });

    // Step 3: Score each PG
    const results = affordable.map(pg => {
        const { score, breakdown, issues } = calculateFitScore(studentPrefs, pg, campus);
        return { pg, score, breakdown, issues };
    });

    // Step 4: Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
}

// ── Export ────────────────────────────────────────
module.exports = { calculateFitScore, generateWeights, rankPGs };
