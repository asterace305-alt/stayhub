import pandas as pd

# student ka data - yeh baad mein form se aayega
student = {
    "budget": 8000,
    "max_distance": 2.0,
    "needs_food": True,
    "min_wifi": 20,
    "curfew": "no_curfew",
    "gender": "female"
}

def calculate_fit_score(student, pg):
    
    # budget - how much over/under are they
    b_score = max(0, 1 - max(0, pg["rent"] - student["budget"]) / student["budget"])
    
    # distance from campus
    d_score = max(0, 1 - pg["distance"] / student["max_distance"])
    
    # food
    if student["needs_food"]:
        f_score = 1.0 if pg["food"] else 0.0
    else:
        f_score = 0.6
    
    # wifi - double the minimum is considered full score
    w_score = min(1.0, pg["wifi"] / (student["min_wifi"] * 2))
    
    # safety out of 10
    s_score = pg["safety_score"] / 10
    
    # verification tier
    tier_map = {"premium": 1.0, "verified": 0.75, "basic": 0.3}
    v_score = tier_map.get(pg["tier"], 0.3)

    # weights change based on gender
    if student["gender"] == "female":
        w = [0.18, 0.18, 0.14, 0.08, 0.27, 0.05]
    else:
        w = [0.22, 0.20, 0.15, 0.10, 0.13, 0.05]

    scores = [b_score, d_score, f_score, w_score, s_score, v_score]
    final = round(sum(w[i] * scores[i] for i in range(6)) * 100)

    breakdown = {
        "Budget": round(b_score * 100),
        "Distance": round(d_score * 100),
        "Food": round(f_score * 100),
        "WiFi": round(w_score * 100),
        "Safety": round(s_score * 100),
        "Verified": round(v_score * 100),
    }

    issues = []
    if f_score == 0.0:
        issues.append("Food not available")
    if b_score < 0.9:
        issues.append(f"Rent Rs.{pg['rent']} is over budget of Rs.{student['budget']}")
    if d_score < 0.5:
        issues.append(f"Distance {pg['distance']}km is quite far")
    if s_score < 0.6:
        issues.append("Low safety score for this area")
    if v_score < 0.5:
        issues.append("PG is not verified")

    return final, breakdown, issues


df = pd.read_excel("Dataset_01.xlsx")
results = []

for index, row in df.iterrows():
    pg = {
        "name": row["PG/Hostel Name"],
        "area": row["Area"],
        "distance": row["Distance from Kondhwa campus (in km)"] if pd.notna(row["Distance from Kondhwa campus (in km)"]) else 5.0,
        "rent": float(str(row["Rent (₹/month) app."]).split("-")[0].replace(",","").strip()) if pd.notna(row["Rent (₹/month) app."]) else 10000,
        "food": str(row["Food Included"]).strip().lower() == "yes",
        "wifi": float(str(row["Wi-Fi Speed (Mbps)"]).replace("mbps","").replace("mpbs","").replace("~","").strip().split()[0]) if pd.notna(row["Wi-Fi Speed (Mbps)"]) and str(row["Wi-Fi Speed (Mbps)"]) not in ["NA","None"] else 20,
        "ac": str(row["AC"]).strip().lower() == "yes",
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

results.sort(reverse=True)

print("\nSTAYHUB - RANKED RESULTS")
print("="*50)

for rank, (score, name, area, breakdown, issues) in enumerate(results, 1):
    print(f"\n#{rank} {name}")
    print(f"Location: {area} | Score: {score}/100")
    print("Breakdown:")
    for param, val in breakdown.items():
        status = "OK" if val >= 70 else "avg" if val >= 40 else "low"
        print(f"  {param}: {val}% ({status})")
    if issues:
        print("Issues:")
        for issue in issues:
            print(f"  - {issue}")
    print("-"*40)