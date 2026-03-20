import pandas as pd

# Student preference
student = {
    "budget": 8000,
    "max_distance": 2.0,
    "needs_food": True,
    "min_wifi": 20,
    "curfew": "no_curfew",
    "gender": "female"
}

# Fit Score function
def calculate_fit_score(student, pg):

    # Step 1 - Calculate each parameter score (0 to 1)
    budget_score = max(0, 1 - max(0, pg["rent"] - student["budget"]) / student["budget"])
    distance_score = max(0, 1 - pg["distance"] / student["max_distance"])

    if student["needs_food"] == True:
        food_score = 1.0 if pg["food"] == True else 0.0
    else:
        food_score = 0.6

    wifi_score = min(1.0, pg["wifi"] / (student["min_wifi"] * 2))
    safety_score = pg["safety_score"] / 10

    if pg["tier"] == "premium":
        verified_score = 1.0
    elif pg["tier"] == "verified":
        verified_score = 0.75
    else:
        verified_score = 0.3

    # Step 2 - Weights
    if student["gender"] == "female":
        weights = {
            "budget": 0.18,
            "distance": 0.18,
            "food": 0.14,
            "wifi": 0.08,
            "safety": 0.27,
            "verified": 0.05
        }
    else:
        weights = {
            "budget": 0.22,
            "distance": 0.20,
            "food": 0.15,
            "wifi": 0.10,
            "safety": 0.13,
            "verified": 0.05
        }

    # Step 3 - Final score
    final_score = (
        weights["budget"]   * budget_score +
        weights["distance"] * distance_score +
        weights["food"]     * food_score +
        weights["wifi"]     * wifi_score +
        weights["safety"]   * safety_score +
        weights["verified"] * verified_score
    )
    final_score = round(final_score * 100)

    # Step 4 - Breakdown
    breakdown = {
        "Budget":   round(budget_score * 100),
        "Distance": round(distance_score * 100),
        "Food":     round(food_score * 100),
        "WiFi":     round(wifi_score * 100),
        "Safety":   round(safety_score * 100),
        "Verified": round(verified_score * 100),
    }

    # Step 5 - Issues
    issues = []
    if food_score == 0.0:
        issues.append("❌ Food not available — you need food included")
    if budget_score < 0.9:
        issues.append(f"⚠️ Rent ₹{pg['rent']} is over your budget of ₹{student['budget']}")
    if distance_score < 0.5:
        issues.append(f"⚠️ Distance {pg['distance']}km — quite far from campus")
    if safety_score < 0.6:
        issues.append("❌ Safety score is low for this area")
    if verified_score < 0.5:
        issues.append("⚠️ PG is not verified")

    return final_score, breakdown, issues

# Excel se saare PGs load karo
df = pd.read_excel("Dataset_01.xlsx")

# Saare PGs ke liye Fit Score calculate karo
results = []

for index, row in df.iterrows():
    pg = {
        "name": row["PG/Hostel Name"],
        "area": row["Area"],
        "distance": row["Distance from Kondhwa campus (in km)"] if pd.notna(row["Distance from Kondhwa campus (in km)"]) else 5.0,
        "rent": float(str(row["Rent (₹/month) app."]).split("-")[0].replace(",","").strip()) if pd.notna(row["Rent (₹/month) app."]) else 10000,
        "food": True if str(row["Food Included"]).strip().lower() == "yes" else False,
        "wifi": float(str(row["Wi-Fi Speed (Mbps)"]).replace("mbps","").replace("mpbs","").replace("~","").strip().split()[0]) if pd.notna(row["Wi-Fi Speed (Mbps)"]) and str(row["Wi-Fi Speed (Mbps)"]) not in ["NA","None"] else 20,
        "ac": True if str(row["AC"]).strip().lower() == "yes" else False,
        "curfew": "no_curfew",
        "gender": str(row["Occupant Type (M/F)"]).strip().lower(),
        "safety_score": 7.0,
        "verified": False,
        "tier": "basic"
    }

    try:
        score, breakdown, issues = calculate_fit_score(student, pg)
        results.append((score, pg["name"], pg["area"], breakdown, issues))
    except:
        pass

# Best to worst rank karo
results.sort(reverse=True)

# Print karo
print("\n" + "="*50)
print("🏆 STAYHUB — RANKED RESULTS")
print("="*50)

for rank, (score, name, area, breakdown, issues) in enumerate(results, 1):
    print(f"\n#{rank} {name}")
    print(f"📍 {area} | 🎯 Fit Score: {score}/100")
    print("📊 Breakdown:")
    for param, val in breakdown.items():
        emoji = "✅" if val >= 70 else "⚠️" if val >= 40 else "❌"
        print(f"   {emoji} {param}: {val}%")
    if issues:
        print("💡 Issues:")
        for issue in issues:
            print(f"   {issue}")
    print("-"*40)