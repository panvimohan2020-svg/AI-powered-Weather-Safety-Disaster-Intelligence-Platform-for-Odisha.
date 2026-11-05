import unittest
import json
import time
from fastapi.testclient import TestClient

from main import app
from emergency_engine import (
    GLOBAL_ALERT_STORE,
    ALERT_LEVELS,
    ODISHA_RIVER_GAUGES,
    MAJOR_DAM_RESERVOIRS,
    OFFICIAL_SOURCES_DOCUMENTATION,
    evaluate_and_generate_alerts_for_district,
    trigger_simulated_alert
)
from shelters_data import (
    find_nearest_shelters,
    EMERGENCY_CONTACTS,
    VERIFIED_SHELTERS
)

class TestOdishaEmergencyAlertNetwork(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Clear simulations before each test
        for aid, a in list(GLOBAL_ALERT_STORE.alerts.items()):
            if a.get("is_simulation", False):
                GLOBAL_ALERT_STORE.alerts.pop(aid, None)

    def test_01_alert_levels_hierarchy(self):
        """Verify the 5-tier alert hierarchy (Level 0 Information to Level 4 Emergency)."""
        self.assertEqual(len(ALERT_LEVELS), 5)
        self.assertEqual(ALERT_LEVELS[0]["name"], "Information")
        self.assertEqual(ALERT_LEVELS[1]["name"], "Advisory")
        self.assertEqual(ALERT_LEVELS[2]["name"], "Watch")
        self.assertEqual(ALERT_LEVELS[3]["name"], "Warning")
        self.assertEqual(ALERT_LEVELS[4]["name"], "Emergency")

    def test_02_alert_deduplication_and_revision(self):
        """Verify exact duplicates are suppressed, and updates increment revision numbers."""
        test_alert = {
            "alert_id": "TEST-CYC-001",
            "parent_event_id": "EVENT-CYC-TEST",
            "category": "CYCLONE",
            "severity_level": 3,
            "headline": "Gale Warning for Puri",
            "affected_districts": ["Puri"],
            "valid_until": "2026-10-31T20:00:00+05:30",
            "is_official": True,
            "is_simulation": False
        }

        # First ingestion
        added, aid = GLOBAL_ALERT_STORE.add_or_update_alert(test_alert)
        self.assertTrue(added)
        self.assertEqual(GLOBAL_ALERT_STORE.alerts[aid]["revision"], 1)

        # Duplicate ingestion (identical content)
        added_dup, _ = GLOBAL_ALERT_STORE.add_or_update_alert(test_alert)
        self.assertFalse(added_dup, "Identical content must be suppressed by deduplication.")

        # Update event (modified headline / severity to Level 4)
        updated_alert = test_alert.copy()
        updated_alert["alert_id"] = "TEST-CYC-002"
        updated_alert["severity_level"] = 4
        updated_alert["headline"] = "EXTREME CYCLONE WARNING for Puri"
        added_upd, aid_upd = GLOBAL_ALERT_STORE.add_or_update_alert(updated_alert)
        self.assertTrue(added_upd)
        self.assertEqual(GLOBAL_ALERT_STORE.alerts[aid_upd]["revision"], 2)
        self.assertEqual(GLOBAL_ALERT_STORE.alerts[aid_upd]["status"], "updated")

    def test_03_cwc_river_gauges_and_reservoirs(self):
        """Verify CWC river monitoring stations and dam release endpoints."""
        resp = self.client.get("/api/emergency/river-levels")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("river_gauges", data)
        self.assertIn("dam_reservoirs", data)
        self.assertGreaterEqual(len(data["river_gauges"]), 5)

        # Check Mahanadi Naraj station
        naraj = next((g for g in data["river_gauges"] if g["station"] == "Naraj"), None)
        self.assertIsNotNone(naraj)
        self.assertEqual(naraj["river"], "Mahanadi")
        self.assertEqual(naraj["warning_level_m"], 25.41)
        self.assertEqual(naraj["danger_level_m"], 26.41)

        # Check Hirakud Dam
        hirakud = next((d for d in data["dam_reservoirs"] if "Hirakud" in d["name"]), None)
        self.assertIsNotNone(hirakud)
        self.assertEqual(hirakud["full_reservoir_level_ft"], 630.00)

    def test_04_authoritative_seismic_feed(self):
        """Verify earthquake notifications adhere to scientific standards (no false predictions)."""
        resp = self.client.get("/api/emergency/earthquakes")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("events", data)
        self.assertIn("scientific_notice", data)
        self.assertIn("Earthquakes cannot be predicted in advance", data["scientific_notice"])
        self.assertIn("safety_principles", data)

    def test_05_verified_shelters_search_and_proximity(self):
        """Verify OSDMA verified cyclone/flood shelters are ranked by proximity."""
        # Query shelters for coastal Puri
        resp = self.client.get("/api/emergency/shelters?district=Puri")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("shelters", data)
        shelters = data["shelters"]
        self.assertGreater(len(shelters), 0)

        # Ensure sorted by distance ascending
        distances = [s["distance_km"] for s in shelters]
        self.assertEqual(distances, sorted(distances))

        # Check required facility attributes
        first_shelter = shelters[0]
        self.assertIn("capacity_persons", first_shelter)
        self.assertIn("amenities", first_shelter)
        self.assertIn("contact_phone", first_shelter)
        self.assertTrue(first_shelter["verified"])

    def test_06_official_emergency_contacts(self):
        """Verify state 112, OSDMA 1070, and district DEOC directories."""
        resp = self.client.get("/api/emergency/contacts?district=Balasore")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("state_toll_free", data)
        toll_free_numbers = [c["number"] for c in data["state_toll_free"]]
        self.assertIn("112", toll_free_numbers)
        self.assertIn("1070", toll_free_numbers)
        self.assertIn("1077", toll_free_numbers)

        # Balasore DEOC
        self.assertEqual(data["district_deoc"], "+91-6782-262070")

    def test_07_citizen_incident_reporting_workflow(self):
        """Verify citizen reports are marked unverified and subject to admin review."""
        report_payload = {
            "district": "Cuttack",
            "incident_type": "flooding",
            "location_details": "Mahanadi embankment near Jobra Barrage",
            "description": "Localized waterlogging about 1 foot deep on service road.",
            "severity": "minor",
            "reporter_name": "Field Volunteer",
            "reporter_phone": "+91-9876543210"
        }

        # 1. Citizen submits report
        resp = self.client.post("/api/emergency/report-incident", json=report_payload)
        self.assertEqual(resp.status_code, 200)
        sub_data = resp.json()
        self.assertEqual(sub_data["status"], "submitted")
        inc_id = sub_data["incident_id"]

        # 2. Retrieve incidents list
        list_resp = self.client.get("/api/emergency/incidents?district=Cuttack")
        self.assertEqual(list_resp.status_code, 200)
        incidents = list_resp.json()["incidents"]
        target_inc = next((i for i in incidents if i["id"] == inc_id), None)
        self.assertIsNotNone(target_inc)
        self.assertEqual(target_inc["status"], "pending_verification")
        self.assertFalse(target_inc["is_official_alert"])
        self.assertIn("Citizen Incident Report - Unverified", target_inc["disclaimer"])

        # 3. Admin reviews and verifies report
        rev_resp = self.client.post("/api/emergency/admin/review-incident", json={
            "incident_id": inc_id,
            "new_status": "verified",
            "admin_notes": "Verified by local Ward Inspector"
        })
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()["new_status"], "verified")

    def test_08_emergency_simulation_engine(self):
        """Verify safe test simulation creation, alerting, and clean teardown."""
        sim_resp = self.client.post("/api/emergency/simulate", json={
            "scenario_type": "cyclone_warning",
            "district": "Ganjam (Brahmapur)"
        })
        self.assertEqual(sim_resp.status_code, 200)
        sim_data = sim_resp.json()
        self.assertEqual(sim_data["status"], "simulated")
        self.assertTrue(sim_data["alert"]["is_simulation"])
        self.assertEqual(sim_data["alert"]["severity_level"], 4)
        self.assertIn("[TEST SIMULATION]", sim_data["alert"]["headline"])

        # Verify active alerts query returns the simulated alert
        active_resp = self.client.get("/api/emergency/alerts?district=Ganjam (Brahmapur)")
        self.assertEqual(active_resp.status_code, 200)
        active_alerts = active_resp.json()["alerts"]
        sim_found = next((a for a in active_alerts if a["is_simulation"]), None)
        self.assertIsNotNone(sim_found)

        # Clear simulations
        clear_resp = self.client.post("/api/emergency/simulate", json={"action": "clear_all"})
        self.assertEqual(clear_resp.status_code, 200)
        self.assertEqual(clear_resp.json()["status"], "cleared")

    def test_09_official_sources_transparency_registry(self):
        """Verify source transparency documentation covers IMD, OSDMA, CWC, NCS, INCOIS."""
        resp = self.client.get("/api/emergency/sources-info")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        sources = data["official_sources"]
        source_codes = [s["source_code"] for s in sources]
        self.assertIn("IMD_BBS", source_codes)
        self.assertIn("OSDMA_SRC", source_codes)
        self.assertIn("CWC_ODISHA", source_codes)
        self.assertIn("NCS_USGS", source_codes)
        self.assertIn("INCOIS", source_codes)

        for s in sources:
            self.assertIn("authority_name", s)
            self.assertIn("data_format", s)
            self.assertIn("update_frequency", s)
            self.assertIn("known_limitations", s)

    def test_10_alert_cancellation(self):
        """Verify alert cancellation changes status to 'cancelled' and removes from active."""
        sim_resp = self.client.post("/api/emergency/simulate", json={
            "scenario_type": "river_flood",
            "district": "Boudh"
        })
        alert_id = sim_resp.json()["alert"]["alert_id"]

        cancel_resp = self.client.post(f"/api/emergency/admin/cancel-alert?alert_id={alert_id}&reason=Flood+waters+receded")
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(cancel_resp.json()["status"], "cancelled")

        # Confirm not returned in active alerts
        active_resp = self.client.get("/api/emergency/alerts?district=Boudh")
        active_alerts = active_resp.json()["alerts"]
        self.assertFalse(any(a["alert_id"] == alert_id for a in active_alerts))

    def test_11_gunupur_gps_resolves_to_rayagada(self):
        """Verify GPS in Gunupur (19.08, 83.81) and GIET (19.048, 83.832) correctly resolves to Rayagada district."""
        # 1. Gunupur Town Coordinates
        resp_town = self.client.post("/api/workability", json={"latitude": 19.08, "longitude": 83.81})
        self.assertEqual(resp_town.status_code, 200)
        data_town = resp_town.json()
        self.assertEqual(data_town["district"], "Rayagada", "Gunupur GPS coordinates must resolve to Rayagada, not Gajapati")
        self.assertEqual(data_town["locality"], "Gunupur")
        self.assertFalse(data_town.get("is_outside_odisha", False))

        # 2. GIET University Gunupur Coordinates
        resp_giet = self.client.post("/api/workability", json={"latitude": 19.048, "longitude": 83.832})
        self.assertEqual(resp_giet.status_code, 200)
        data_giet = resp_giet.json()
        self.assertEqual(data_giet["district"], "Rayagada", "GIET Gunupur GPS must resolve to Rayagada")

        # 3. Direct district query by sub-division name
        resp_name = self.client.post("/api/workability", json={"district": "Gunupur"})
        self.assertEqual(resp_name.status_code, 200)
        data_name = resp_name.json()
        self.assertEqual(data_name["district"], "Rayagada")

        # 4. Nearest shelter query from Gunupur coordinates
        shelters_resp = self.client.get("/api/emergency/shelters?lat=19.08&lon=83.81")
        self.assertEqual(shelters_resp.status_code, 200)
        shelters = shelters_resp.json()["shelters"]
        self.assertTrue(len(shelters) > 0)
        # The top shelter should be in Gunupur, Rayagada with < 2 km distance
        top_shelter = shelters[0]
        self.assertEqual(top_shelter["district"], "Rayagada")
        self.assertIn("Gunupur", top_shelter["name"])
        self.assertLess(top_shelter["distance_km"], 2.0)

    def test_12_web_push_notification_endpoints(self):
        """Verify VAPID public key retrieval, subscription registration, and test dispatch."""
        # 1. VAPID Key Retrieval
        vapid_resp = self.client.get("/api/emergency/push-vapid-key")
        self.assertEqual(vapid_resp.status_code, 200)
        vdata = vapid_resp.json()
        self.assertEqual(vdata["status"], "success")
        self.assertTrue(len(vdata["public_key"]) > 30)

        # 2. Push Subscription Registration
        fake_endpoint = "https://fcm.googleapis.com/fcm/send/fake-test-token-12345"
        sub_payload = {
            "endpoint": fake_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcFYVnxWSCN00JVfGtZJ0j",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            },
            "district": "Rayagada"
        }
        sub_resp = self.client.post("/api/emergency/push-subscribe", json=sub_payload)
        self.assertEqual(sub_resp.status_code, 200)
        sdata = sub_resp.json()
        self.assertEqual(sdata["status"], "subscribed")
        self.assertEqual(sdata["district"], "Rayagada")

        # 3. Push Test Dispatch
        test_resp = self.client.post("/api/emergency/push-test", json={"district": "Rayagada"})
        self.assertEqual(test_resp.status_code, 200)
        tdata = test_resp.json()
        self.assertEqual(tdata["status"], "dispatched")
        self.assertGreaterEqual(tdata["targeted_subscribers"], 1)

        # 4. Unsubscribe
        unsub_resp = self.client.post("/api/emergency/push-unsubscribe", json={"endpoint": fake_endpoint})
        self.assertEqual(unsub_resp.status_code, 200)
        udata = unsub_resp.json()
        self.assertEqual(udata["status"], "unsubscribed")
        self.assertTrue(udata["removed"])

if __name__ == '__main__':
    unittest.main()
