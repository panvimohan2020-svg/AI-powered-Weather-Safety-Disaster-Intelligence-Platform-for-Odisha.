import httpx

def main():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=15.0)

    # 1. Test districts endpoint
    d_resp = client.get("/api/districts")
    print(f"GET /api/districts status: {d_resp.status_code}, count: {len(d_resp.json()['districts'])}")

    # 2. Test model-info endpoint
    m_resp = client.get("/api/model-info")
    print(f"GET /api/model-info status: {m_resp.status_code}, champion: {m_resp.json().get('selected_champion')}")

    # 3. Test multiple districts for different safety scores and weather
    test_districts = ["Khurda (Bhubaneswar)", "Puri", "Koraput", "Balasore", "Sundargarh", "Malkangiri", "Sambalpur"]
    print("\nDistrict-Wise Live Weather & Safety Score Breakdown:")
    print("-" * 115)
    print(f"{'District':<22} | {'Score':<10} | {'Risk Level':<14} | {'Rain Prob':<9} | {'Temp':<6} | {'Condition':<20} | {'Day?':<6} | {'Sunrise - Sunset'}")
    print("-" * 115)
    for name in test_districts:
        p_resp = client.post("/api/predict", json={"district": name})
        data = p_resp.json()
        w = data["weather"]
        p = data["prediction"]
        score_str = f"{p['safety_score']:.1f}/10"
        print(f"{data['district']:<22} | {score_str:<10} | {p['predicted_risk_level']:<14} | {w['rainfall_percentage']:<9} | {w['temperature_c']} C | {w['condition']:<20} | {str(w['is_daytime']):<6} | {w['sunrise']} - {w['sunset']}")

    print("-" * 115)

if __name__ == "__main__":
    main()
