import math
from typing import Dict, Any, List, Optional, Tuple

ODISHA_30_DISTRICTS: Dict[str, Dict[str, Any]] = {
    "Angul": {
        "name": "Angul",
        "hq": "Angul",
        "lat": 20.838,
        "lon": 85.101,
        "elevation": 139,
        "coast_km": 145.0
    },
    "Balangir": {
        "name": "Balangir",
        "hq": "Balangir",
        "lat": 20.718,
        "lon": 83.488,
        "elevation": 164,
        "coast_km": 315.0
    },
    "Balasore": {
        "name": "Balasore",
        "hq": "Balasore",
        "lat": 21.493,
        "lon": 86.925,
        "elevation": 16,
        "coast_km": 15.0
    },
    "Bargarh": {
        "name": "Bargarh",
        "hq": "Bargarh",
        "lat": 21.333,
        "lon": 83.616,
        "elevation": 171,
        "coast_km": 345.0
    },
    "Bhadrak": {
        "name": "Bhadrak",
        "hq": "Bhadrak",
        "lat": 21.054,
        "lon": 86.495,
        "elevation": 17,
        "coast_km": 30.0
    },
    "Boudh": {
        "name": "Boudh",
        "hq": "Boudh",
        "lat": 20.835,
        "lon": 84.326,
        "elevation": 130,
        "coast_km": 210.0
    },
    "Cuttack": {
        "name": "Cuttack",
        "hq": "Cuttack",
        "lat": 20.462,
        "lon": 85.882,
        "elevation": 36,
        "coast_km": 70.0
    },
    "Deogarh": {
        "name": "Deogarh",
        "hq": "Deogarh",
        "lat": 21.532,
        "lon": 84.733,
        "elevation": 192,
        "coast_km": 255.0
    },
    "Dhenkanal": {
        "name": "Dhenkanal",
        "hq": "Dhenkanal",
        "lat": 20.665,
        "lon": 85.594,
        "elevation": 80,
        "coast_km": 110.0
    },
    "Gajapati": {
        "name": "Gajapati",
        "hq": "Paralakhemundi",
        "lat": 18.815,
        "lon": 84.156,
        "elevation": 150,
        "coast_km": 65.0
    },
    "Ganjam (Brahmapur)": {
        "name": "Ganjam (Brahmapur)",
        "hq": "Chhatrapur / Brahmapur",
        "lat": 19.314,
        "lon": 84.794,
        "elevation": 25,
        "coast_km": 10.0
    },
    "Jagatsinghpur": {
        "name": "Jagatsinghpur",
        "hq": "Jagatsinghpur",
        "lat": 20.267,
        "lon": 86.168,
        "elevation": 15,
        "coast_km": 35.0
    },
    "Jajpur": {
        "name": "Jajpur",
        "hq": "Jajpur",
        "lat": 20.849,
        "lon": 86.332,
        "elevation": 37,
        "coast_km": 55.0
    },
    "Jharsuguda": {
        "name": "Jharsuguda",
        "hq": "Jharsuguda",
        "lat": 21.854,
        "lon": 84.004,
        "elevation": 218,
        "coast_km": 330.0
    },
    "Kalahandi": {
        "name": "Kalahandi",
        "hq": "Bhawanipatna",
        "lat": 19.907,
        "lon": 83.164,
        "elevation": 300,
        "coast_km": 250.0
    },
    "Kandhamal": {
        "name": "Kandhamal",
        "hq": "Phulbani",
        "lat": 20.472,
        "lon": 84.234,
        "elevation": 500,
        "coast_km": 165.0
    },
    "Kendrapara": {
        "name": "Kendrapara",
        "hq": "Kendrapara",
        "lat": 20.498,
        "lon": 86.422,
        "elevation": 13,
        "coast_km": 25.0
    },
    "Kendujhar (Keonjhar)": {
        "name": "Kendujhar (Keonjhar)",
        "hq": "Kendujhar",
        "lat": 21.628,
        "lon": 85.582,
        "elevation": 480,
        "coast_km": 170.0
    },
    "Khurda (Bhubaneswar)": {
        "name": "Khurda (Bhubaneswar)",
        "hq": "Bhubaneswar",
        "lat": 20.296,
        "lon": 85.824,
        "elevation": 45,
        "coast_km": 50.0
    },
    "Koraput": {
        "name": "Koraput",
        "hq": "Koraput",
        "lat": 18.813,
        "lon": 82.711,
        "elevation": 870,
        "coast_km": 150.0
    },
    "Malkangiri": {
        "name": "Malkangiri",
        "hq": "Malkangiri",
        "lat": 18.343,
        "lon": 81.882,
        "elevation": 195,
        "coast_km": 240.0
    },
    "Mayurbhanj (Baripada)": {
        "name": "Mayurbhanj (Baripada)",
        "hq": "Baripada",
        "lat": 21.933,
        "lon": 86.732,
        "elevation": 550,
        "coast_km": 100.0
    },
    "Nabarangpur": {
        "name": "Nabarangpur",
        "hq": "Nabarangpur",
        "lat": 19.229,
        "lon": 82.548,
        "elevation": 582,
        "coast_km": 215.0
    },
    "Nayagarh": {
        "name": "Nayagarh",
        "hq": "Nayagarh",
        "lat": 20.131,
        "lon": 85.104,
        "elevation": 110,
        "coast_km": 80.0
    },
    "Nuapada": {
        "name": "Nuapada",
        "hq": "Nuapada",
        "lat": 20.833,
        "lon": 82.528,
        "elevation": 260,
        "coast_km": 350.0
    },
    "Puri": {
        "name": "Puri",
        "hq": "Puri",
        "lat": 19.813,
        "lon": 85.831,
        "elevation": 0,
        "coast_km": 0.0
    },
    "Rayagada": {
        "name": "Rayagada",
        "hq": "Rayagada",
        "lat": 19.167,
        "lon": 83.416,
        "elevation": 207,
        "coast_km": 130.0
    },
    "Sambalpur": {
        "name": "Sambalpur",
        "hq": "Sambalpur",
        "lat": 21.466,
        "lon": 83.981,
        "elevation": 135,
        "coast_km": 300.0
    },
    "Subarnapur (Sonepur)": {
        "name": "Subarnapur (Sonepur)",
        "hq": "Sonepur",
        "lat": 20.840,
        "lon": 83.916,
        "elevation": 122,
        "coast_km": 270.0
    },
    "Sundargarh": {
        "name": "Sundargarh",
        "hq": "Sundargarh / Rourkela",
        "lat": 22.119,
        "lon": 84.031,
        "elevation": 250,
        "coast_km": 350.0
    }
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

# Comprehensive Sub-division & Tehsil Spatial Anchors across all 30 Odisha Districts
# Prevents false border-assignment (e.g. Gunupur in Rayagada being misidentified as Gajapati)
ODISHA_SUBDIVISIONS: List[Dict[str, Any]] = [
    # Rayagada District
    {"name": "Gunupur", "district": "Rayagada", "lat": 19.080, "lon": 83.815, "elevation": 83},
    {"name": "GIET University / Gunupur South", "district": "Rayagada", "lat": 19.048, "lon": 83.832, "elevation": 86},
    {"name": "Rayagada Town", "district": "Rayagada", "lat": 19.167, "lon": 83.416, "elevation": 207},
    {"name": "Gudari", "district": "Rayagada", "lat": 19.345, "lon": 83.778, "elevation": 125},
    {"name": "Padmapur", "district": "Rayagada", "lat": 19.243, "lon": 83.818, "elevation": 110},
    {"name": "Bissam Cuttack", "district": "Rayagada", "lat": 19.517, "lon": 83.517, "elevation": 342},
    {"name": "Muniguda", "district": "Rayagada", "lat": 19.633, "lon": 83.483, "elevation": 240},
    {"name": "Kashipur", "district": "Rayagada", "lat": 19.367, "lon": 83.117, "elevation": 810},
    {"name": "Ramanaguda", "district": "Rayagada", "lat": 19.070, "lon": 83.660, "elevation": 140},
    {"name": "Kolnara", "district": "Rayagada", "lat": 19.267, "lon": 83.450, "elevation": 220},
    {"name": "Chandrapur", "district": "Rayagada", "lat": 19.583, "lon": 83.683, "elevation": 410},

    # Gajapati District
    {"name": "Paralakhemundi", "district": "Gajapati", "lat": 18.815, "lon": 84.156, "elevation": 150},
    {"name": "Mohana", "district": "Gajapati", "lat": 19.433, "lon": 84.283, "elevation": 590},
    {"name": "R.Udayagiri", "district": "Gajapati", "lat": 19.167, "lon": 84.133, "elevation": 610},
    {"name": "Kashinagara", "district": "Gajapati", "lat": 18.783, "lon": 84.000, "elevation": 75},
    {"name": "Gumma", "district": "Gajapati", "lat": 18.967, "lon": 84.150, "elevation": 280},
    {"name": "Nuagada", "district": "Gajapati", "lat": 18.983, "lon": 84.250, "elevation": 320},

    # Koraput District
    {"name": "Koraput Town", "district": "Koraput", "lat": 18.813, "lon": 82.711, "elevation": 870},
    {"name": "Jeypore", "district": "Koraput", "lat": 18.857, "lon": 82.569, "elevation": 650},
    {"name": "Sunabeda", "district": "Koraput", "lat": 18.729, "lon": 82.805, "elevation": 880},
    {"name": "Damanjodi", "district": "Koraput", "lat": 18.775, "lon": 82.916, "elevation": 910},
    {"name": "Kotpad", "district": "Koraput", "lat": 19.143, "lon": 82.327, "elevation": 570},
    {"name": "Semiliguda", "district": "Koraput", "lat": 18.706, "lon": 82.871, "elevation": 890},
    {"name": "Borigumma", "district": "Koraput", "lat": 19.033, "lon": 82.567, "elevation": 590},
    {"name": "Pottangi", "district": "Koraput", "lat": 18.572, "lon": 82.969, "elevation": 920},

    # Ganjam (Brahmapur) District
    {"name": "Brahmapur City", "district": "Ganjam (Brahmapur)", "lat": 19.314, "lon": 84.794, "elevation": 25},
    {"name": "Chhatrapur", "district": "Ganjam (Brahmapur)", "lat": 19.355, "lon": 84.992, "elevation": 12},
    {"name": "Gopalpur-on-Sea", "district": "Ganjam (Brahmapur)", "lat": 19.260, "lon": 84.910, "elevation": 5},
    {"name": "Bhanjanagar", "district": "Ganjam (Brahmapur)", "lat": 19.931, "lon": 84.580, "elevation": 85},
    {"name": "Aska", "district": "Ganjam (Brahmapur)", "lat": 19.610, "lon": 84.660, "elevation": 30},
    {"name": "Hinjilicut", "district": "Ganjam (Brahmapur)", "lat": 19.481, "lon": 84.743, "elevation": 30},
    {"name": "Digapahandi", "district": "Ganjam (Brahmapur)", "lat": 19.373, "lon": 84.583, "elevation": 52},
    {"name": "Khallikote", "district": "Ganjam (Brahmapur)", "lat": 19.608, "lon": 85.083, "elevation": 40},

    # Kalahandi District
    {"name": "Bhawanipatna", "district": "Kalahandi", "lat": 19.907, "lon": 83.164, "elevation": 300},
    {"name": "Dharamgarh", "district": "Kalahandi", "lat": 19.867, "lon": 82.783, "elevation": 260},
    {"name": "Kesinga", "district": "Kalahandi", "lat": 20.200, "lon": 83.233, "elevation": 200},
    {"name": "Junagarh", "district": "Kalahandi", "lat": 19.850, "lon": 82.933, "elevation": 230},
    {"name": "Jaipatna", "district": "Kalahandi", "lat": 19.467, "lon": 82.817, "elevation": 290},

    # Kandhamal District
    {"name": "Phulbani", "district": "Kandhamal", "lat": 20.472, "lon": 84.234, "elevation": 500},
    {"name": "Baliguda", "district": "Kandhamal", "lat": 20.200, "lon": 83.900, "elevation": 520},
    {"name": "G.Udayagiri", "district": "Kandhamal", "lat": 20.133, "lon": 84.367, "elevation": 710},
    {"name": "Daringbadi", "district": "Kandhamal", "lat": 19.900, "lon": 84.133, "elevation": 915},
    {"name": "Raikia", "district": "Kandhamal", "lat": 20.067, "lon": 84.233, "elevation": 640},

    # Malkangiri District
    {"name": "Malkangiri Town", "district": "Malkangiri", "lat": 18.343, "lon": 81.882, "elevation": 195},
    {"name": "Balimela", "district": "Malkangiri", "lat": 18.250, "lon": 82.133, "elevation": 460},
    {"name": "Kalimela", "district": "Malkangiri", "lat": 18.067, "lon": 81.700, "elevation": 160},
    {"name": "Motu", "district": "Malkangiri", "lat": 17.842, "lon": 81.385, "elevation": 50},
    {"name": "Mathili", "district": "Malkangiri", "lat": 18.567, "lon": 82.050, "elevation": 260},

    # Nabarangpur District
    {"name": "Nabarangpur Town", "district": "Nabarangpur", "lat": 19.229, "lon": 82.548, "elevation": 582},
    {"name": "Umerkote", "district": "Nabarangpur", "lat": 19.667, "lon": 82.200, "elevation": 620},
    {"name": "Raighar", "district": "Nabarangpur", "lat": 19.883, "lon": 82.017, "elevation": 610},
    {"name": "Jharigam", "district": "Nabarangpur", "lat": 19.633, "lon": 82.483, "elevation": 590},

    # Khurda (Bhubaneswar) District
    {"name": "Bhubaneswar City", "district": "Khurda (Bhubaneswar)", "lat": 20.296, "lon": 85.824, "elevation": 45},
    {"name": "Khurda Town", "district": "Khurda (Bhubaneswar)", "lat": 20.183, "lon": 85.617, "elevation": 75},
    {"name": "Jatni", "district": "Khurda (Bhubaneswar)", "lat": 20.167, "lon": 85.700, "elevation": 36},
    {"name": "Balugaon", "district": "Khurda (Bhubaneswar)", "lat": 19.750, "lon": 85.200, "elevation": 15},
    {"name": "Banapur", "district": "Khurda (Bhubaneswar)", "lat": 19.783, "lon": 85.183, "elevation": 25},
    {"name": "Tangi", "district": "Khurda (Bhubaneswar)", "lat": 19.917, "lon": 85.400, "elevation": 30},

    # Cuttack District
    {"name": "Cuttack City", "district": "Cuttack", "lat": 20.462, "lon": 85.882, "elevation": 36},
    {"name": "Choudwar", "district": "Cuttack", "lat": 20.533, "lon": 85.917, "elevation": 38},
    {"name": "Athagarh", "district": "Cuttack", "lat": 20.533, "lon": 85.633, "elevation": 65},
    {"name": "Banki", "district": "Cuttack", "lat": 20.383, "lon": 85.533, "elevation": 48},
    {"name": "Salepur", "district": "Cuttack", "lat": 20.483, "lon": 86.117, "elevation": 22},

    # Puri District
    {"name": "Puri City", "district": "Puri", "lat": 19.813, "lon": 85.831, "elevation": 0},
    {"name": "Konark", "district": "Puri", "lat": 19.888, "lon": 86.094, "elevation": 5},
    {"name": "Pipili", "district": "Puri", "lat": 20.117, "lon": 85.833, "elevation": 19},
    {"name": "Nimapara", "district": "Puri", "lat": 20.067, "lon": 86.017, "elevation": 14},
    {"name": "Satapada (Chilika)", "district": "Puri", "lat": 19.670, "lon": 85.430, "elevation": 2},

    # Balasore District
    {"name": "Balasore Town", "district": "Balasore", "lat": 21.493, "lon": 86.925, "elevation": 16},
    {"name": "Jaleswar", "district": "Balasore", "lat": 21.800, "lon": 87.217, "elevation": 18},
    {"name": "Soro", "district": "Balasore", "lat": 21.283, "lon": 86.683, "elevation": 16},
    {"name": "Nilagiri", "district": "Balasore", "lat": 21.460, "lon": 86.767, "elevation": 45},
    {"name": "Chandipur", "district": "Balasore", "lat": 21.470, "lon": 87.020, "elevation": 4},

    # Bhadrak District
    {"name": "Bhadrak Town", "district": "Bhadrak", "lat": 21.054, "lon": 86.495, "elevation": 17},
    {"name": "Dhamra Port", "district": "Bhadrak", "lat": 20.793, "lon": 86.887, "elevation": 5},
    {"name": "Chandbali", "district": "Bhadrak", "lat": 20.783, "lon": 86.750, "elevation": 7},
    {"name": "Basudevpur", "district": "Bhadrak", "lat": 21.133, "lon": 86.750, "elevation": 10},

    # Jagatsinghpur District
    {"name": "Jagatsinghpur Town", "district": "Jagatsinghpur", "lat": 20.267, "lon": 86.168, "elevation": 15},
    {"name": "Paradip Port", "district": "Jagatsinghpur", "lat": 20.317, "lon": 86.617, "elevation": 4},
    {"name": "Tirtol", "district": "Jagatsinghpur", "lat": 20.317, "lon": 86.333, "elevation": 12},

    # Kendrapara District
    {"name": "Kendrapara Town", "district": "Kendrapara", "lat": 20.498, "lon": 86.422, "elevation": 13},
    {"name": "Pattamundai", "district": "Kendrapara", "lat": 20.567, "lon": 86.567, "elevation": 12},
    {"name": "Rajnagar", "district": "Kendrapara", "lat": 20.583, "lon": 86.733, "elevation": 8},

    # Jajpur District
    {"name": "Jajpur Town", "district": "Jajpur", "lat": 20.849, "lon": 86.332, "elevation": 37},
    {"name": "Vyasanagar / Jajpur Road", "district": "Jajpur", "lat": 20.950, "lon": 86.133, "elevation": 52},
    {"name": "Chandikhole", "district": "Jajpur", "lat": 20.683, "lon": 86.150, "elevation": 35},
    {"name": "Sukinda", "district": "Jajpur", "lat": 20.967, "lon": 85.900, "elevation": 80},

    # Mayurbhanj (Baripada) District
    {"name": "Baripada Town", "district": "Mayurbhanj (Baripada)", "lat": 21.933, "lon": 86.732, "elevation": 550},
    {"name": "Rairangpur", "district": "Mayurbhanj (Baripada)", "lat": 22.267, "lon": 86.167, "elevation": 250},
    {"name": "Karanjia", "district": "Mayurbhanj (Baripada)", "lat": 21.733, "lon": 85.967, "elevation": 380},
    {"name": "Udala", "district": "Mayurbhanj (Baripada)", "lat": 21.567, "lon": 86.567, "elevation": 70},

    # Kendujhar (Keonjhar) District
    {"name": "Kendujhar Town", "district": "Kendujhar (Keonjhar)", "lat": 21.628, "lon": 85.582, "elevation": 480},
    {"name": "Anandapur", "district": "Kendujhar (Keonjhar)", "lat": 21.217, "lon": 86.117, "elevation": 45},
    {"name": "Barbil", "district": "Kendujhar (Keonjhar)", "lat": 22.117, "lon": 85.400, "elevation": 477},
    {"name": "Joda", "district": "Kendujhar (Keonjhar)", "lat": 22.017, "lon": 85.433, "elevation": 460},
    {"name": "Champua", "district": "Kendujhar (Keonjhar)", "lat": 22.083, "lon": 85.667, "elevation": 360},

    # Sundargarh District
    {"name": "Sundargarh Town", "district": "Sundargarh", "lat": 22.119, "lon": 84.031, "elevation": 250},
    {"name": "Rourkela Steel City", "district": "Sundargarh", "lat": 22.260, "lon": 84.854, "elevation": 219},
    {"name": "Rajgangpur", "district": "Sundargarh", "lat": 22.193, "lon": 84.582, "elevation": 230},
    {"name": "Biramitrapur", "district": "Sundargarh", "lat": 22.400, "lon": 84.767, "elevation": 235},
    {"name": "Bonai", "district": "Sundargarh", "lat": 21.750, "lon": 84.967, "elevation": 185},

    # Sambalpur District
    {"name": "Sambalpur City", "district": "Sambalpur", "lat": 21.466, "lon": 83.981, "elevation": 135},
    {"name": "Burla", "district": "Sambalpur", "lat": 21.503, "lon": 83.871, "elevation": 150},
    {"name": "Hirakud", "district": "Sambalpur", "lat": 21.520, "lon": 83.900, "elevation": 160},
    {"name": "Kuchinda", "district": "Sambalpur", "lat": 22.083, "lon": 84.350, "elevation": 220},
    {"name": "Rairakhol", "district": "Sambalpur", "lat": 21.067, "lon": 84.333, "elevation": 165},

    # Jharsuguda District
    {"name": "Jharsuguda Town", "district": "Jharsuguda", "lat": 21.854, "lon": 84.004, "elevation": 218},
    {"name": "Brajrajnagar", "district": "Jharsuguda", "lat": 21.817, "lon": 83.917, "elevation": 210},
    {"name": "Belpahar", "district": "Jharsuguda", "lat": 21.800, "lon": 83.850, "elevation": 220},

    # Bargarh District
    {"name": "Bargarh Town", "district": "Bargarh", "lat": 21.333, "lon": 83.616, "elevation": 171},
    {"name": "Padampur", "district": "Bargarh", "lat": 21.000, "lon": 83.067, "elevation": 205},
    {"name": "Barpali", "district": "Bargarh", "lat": 21.183, "lon": 83.583, "elevation": 180},
    {"name": "Attabira", "district": "Bargarh", "lat": 21.367, "lon": 83.767, "elevation": 175},

    # Balangir District
    {"name": "Balangir Town", "district": "Balangir", "lat": 20.718, "lon": 83.488, "elevation": 164},
    {"name": "Titilagarh", "district": "Balangir", "lat": 20.300, "lon": 83.150, "elevation": 215},
    {"name": "Patnagarh", "district": "Balangir", "lat": 20.717, "lon": 83.133, "elevation": 240},
    {"name": "Kantabanji", "district": "Balangir", "lat": 20.483, "lon": 82.833, "elevation": 298},

    # Subarnapur (Sonepur) District
    {"name": "Sonepur Town", "district": "Subarnapur (Sonepur)", "lat": 20.840, "lon": 83.916, "elevation": 122},
    {"name": "Birmaharajpur", "district": "Subarnapur (Sonepur)", "lat": 20.883, "lon": 84.083, "elevation": 130},
    {"name": "Tarbha", "district": "Subarnapur (Sonepur)", "lat": 20.733, "lon": 83.633, "elevation": 145},

    # Nuapada District
    {"name": "Nuapada Town", "district": "Nuapada", "lat": 20.833, "lon": 82.528, "elevation": 260},
    {"name": "Khariar", "district": "Nuapada", "lat": 20.283, "lon": 82.767, "elevation": 270},
    {"name": "Khariar Road", "district": "Nuapada", "lat": 20.867, "lon": 82.533, "elevation": 265},

    # Angul District
    {"name": "Angul Town", "district": "Angul", "lat": 20.838, "lon": 85.101, "elevation": 139},
    {"name": "Talcher", "district": "Angul", "lat": 20.950, "lon": 85.217, "elevation": 95},
    {"name": "Athamallik", "district": "Angul", "lat": 20.717, "lon": 84.533, "elevation": 120},
    {"name": "Pallahara", "district": "Angul", "lat": 21.433, "lon": 85.183, "elevation": 160},

    # Dhenkanal District
    {"name": "Dhenkanal Town", "district": "Dhenkanal", "lat": 20.665, "lon": 85.594, "elevation": 80},
    {"name": "Kamakhyanagar", "district": "Dhenkanal", "lat": 20.933, "lon": 85.550, "elevation": 85},
    {"name": "Bhuban", "district": "Dhenkanal", "lat": 20.883, "lon": 85.833, "elevation": 65},

    # Nayagarh District
    {"name": "Nayagarh Town", "district": "Nayagarh", "lat": 20.131, "lon": 85.104, "elevation": 110},
    {"name": "Daspalla", "district": "Nayagarh", "lat": 20.350, "lon": 84.850, "elevation": 125},
    {"name": "Khandapada", "district": "Nayagarh", "lat": 20.267, "lon": 85.183, "elevation": 70},
    {"name": "Ranpur", "district": "Nayagarh", "lat": 20.067, "lon": 85.350, "elevation": 60},

    # Boudh District
    {"name": "Boudh Town", "district": "Boudh", "lat": 20.835, "lon": 84.326, "elevation": 130},
    {"name": "Kantamal", "district": "Boudh", "lat": 20.650, "lon": 83.733, "elevation": 135},
    {"name": "Harbhanga / Charichhak", "district": "Boudh", "lat": 20.683, "lon": 84.600, "elevation": 140},

    # Deogarh District
    {"name": "Deogarh Town", "district": "Deogarh", "lat": 21.532, "lon": 84.733, "elevation": 192},
    {"name": "Barkote", "district": "Deogarh", "lat": 21.550, "lon": 85.017, "elevation": 210},
    {"name": "Reamal", "district": "Deogarh", "lat": 21.367, "lon": 84.783, "elevation": 175}
]

# Alias map for OpenStreetMap Nominatim and government variants
DISTRICT_ALIASES: Dict[str, str] = {
    "rayagada": "Rayagada",
    "gajapati": "Gajapati",
    "koraput": "Koraput",
    "malkangiri": "Malkangiri",
    "nabarangpur": "Nabarangpur",
    "nabarangapur": "Nabarangpur",
    "kalahandi": "Kalahandi",
    "kandhamal": "Kandhamal",
    "ganjam": "Ganjam (Brahmapur)",
    "brahmapur": "Ganjam (Brahmapur)",
    "berhampur": "Ganjam (Brahmapur)",
    "chhatrapur": "Ganjam (Brahmapur)",
    "khordha": "Khurda (Bhubaneswar)",
    "khurda": "Khurda (Bhubaneswar)",
    "bhubaneswar": "Khurda (Bhubaneswar)",
    "cuttack": "Cuttack",
    "puri": "Puri",
    "balasore": "Balasore",
    "baleshwar": "Balasore",
    "bhadrak": "Bhadrak",
    "jagatsinghpur": "Jagatsinghpur",
    "jagatsinghapur": "Jagatsinghpur",
    "kendrapara": "Kendrapara",
    "kendraparha": "Kendrapara",
    "jajpur": "Jajpur",
    "jajapur": "Jajpur",
    "keonjhar": "Kendujhar (Keonjhar)",
    "kendujhar": "Kendujhar (Keonjhar)",
    "mayurbhanj": "Mayurbhanj (Baripada)",
    "baripada": "Mayurbhanj (Baripada)",
    "sundargarh": "Sundargarh",
    "sundergarh": "Sundargarh",
    "rourkela": "Sundargarh",
    "sambalpur": "Sambalpur",
    "jharsuguda": "Jharsuguda",
    "bargarh": "Bargarh",
    "baragarh": "Bargarh",
    "balangir": "Balangir",
    "bolangir": "Balangir",
    "subarnapur": "Subarnapur (Sonepur)",
    "sonepur": "Subarnapur (Sonepur)",
    "sonapur": "Subarnapur (Sonepur)",
    "nuapada": "Nuapada",
    "nuapara": "Nuapada",
    "angul": "Angul",
    "anugul": "Angul",
    "dhenkanal": "Dhenkanal",
    "nayagarh": "Nayagarh",
    "boudh": "Boudh",
    "baudh": "Boudh",
    "deogarh": "Deogarh",
    "debagarh": "Deogarh"
}

# In-memory fast LRU cache for reverse geocoding results
_REVERSE_GEO_CACHE: Dict[Tuple[float, float], Dict[str, Any]] = {}

def reverse_geocode_osm(lat: float, lon: float, timeout_sec: float = 1.8) -> Optional[Dict[str, Any]]:
    """
    Query OpenStreetMap Nominatim reverse geocode with fast timeout and caching.
    Returns official administrative state_district and locality if found.
    """
    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in _REVERSE_GEO_CACHE:
        return _REVERSE_GEO_CACHE[cache_key]

    try:
        import urllib.request
        import json
        
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat:.5f}&lon={lon:.5f}&zoom=11&addressdetails=1"
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "Odisha-WRI-Safety-Platform/2.0 (Meteorological Geospatial Resolver)"}
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                address = data.get("address", {})
                
                # Check state to verify within Odisha or neighboring
                state = address.get("state", "")
                state_district = address.get("state_district") or address.get("county") or address.get("city")
                subdivision = address.get("county") or address.get("town") or address.get("village") or address.get("suburb") or address.get("municipality")

                matched_district = None
                if state_district:
                    cleaned_dist = state_district.lower().replace("district", "").strip()
                    matched_district = DISTRICT_ALIASES.get(cleaned_dist)

                # Fallback: check other address fields for district names
                if not matched_district:
                    for val in address.values():
                        if isinstance(val, str):
                            c_val = val.lower().replace("district", "").strip()
                            if c_val in DISTRICT_ALIASES:
                                matched_district = DISTRICT_ALIASES[c_val]
                                break

                result = {
                    "matched_district": matched_district,
                    "locality": subdivision or address.get("city") or address.get("town"),
                    "state": state,
                    "raw_address": address
                }
                _REVERSE_GEO_CACHE[cache_key] = result
                return result
    except Exception:
        pass
    
    return None

def resolve_district_details(lat: float, lon: float) -> Dict[str, Any]:
    """
    Intelligent Multi-Tier District & Locality Resolution:
    1. Online Official Reverse Geocoding (OSM Nominatim) - Identifies actual administrative county/district
    2. Sub-division & Tehsil Spatial Anchors (Offline High-Precision Index) - Prevents border mismatch
    3. District Headquarter Centroid Fallback
    """
    # Tier 1: Try reverse geocode if network allows
    geo_res = reverse_geocode_osm(lat, lon, timeout_sec=1.5)
    if geo_res and geo_res.get("matched_district"):
        matched = geo_res["matched_district"]
        locality = geo_res.get("locality")
        # Compute distance to this district's HQ
        dist_hq = haversine_km(lat, lon, ODISHA_30_DISTRICTS[matched]["lat"], ODISHA_30_DISTRICTS[matched]["lon"])
        return {
            "district": matched,
            "locality": locality or matched,
            "distance_km": round(dist_hq, 1),
            "method": "official_reverse_geocoding",
            "confidence": "high"
        }

    # Tier 2: Sub-division Spatial Anchor Search (Offline)
    best_subdiv = None
    min_subdiv_dist = float('inf')
    for s in ODISHA_SUBDIVISIONS:
        d = haversine_km(lat, lon, s["lat"], s["lon"])
        if d < min_subdiv_dist:
            min_subdiv_dist = d
            best_subdiv = s

    # If the nearest sub-division is within reasonable range (<= 55 km)
    if best_subdiv and min_subdiv_dist <= 55.0:
        return {
            "district": best_subdiv["district"],
            "locality": best_subdiv["name"],
            "distance_km": round(min_subdiv_dist, 1),
            "method": "subdivision_spatial_index",
            "confidence": "high" if min_subdiv_dist < 25.0 else "medium"
        }

    # Tier 3: Centroid Fallback
    best_district = "Khurda (Bhubaneswar)"
    min_dist = float('inf')
    for name, info in ODISHA_30_DISTRICTS.items():
        dist = haversine_km(lat, lon, info["lat"], info["lon"])
        if dist < min_dist:
            min_dist = dist
            best_district = name

    return {
        "district": best_district,
        "locality": best_district,
        "distance_km": round(min_dist, 1),
        "method": "district_centroid",
        "confidence": "low" if min_dist > 80.0 else "medium"
    }

def find_nearest_district(lat: float, lon: float) -> Tuple[str, float]:
    """
    Backward-compatible district resolver.
    Uses multi-tier spatial intelligence (sub-division index + reverse geocoding).
    """
    details = resolve_district_details(lat, lon)
    return details["district"], details["distance_km"]

def get_district_by_name(query: str) -> Optional[Dict[str, Any]]:
    if not query:
        return None
    q = query.strip().lower()
    
    # 1. Direct district match
    for name, info in ODISHA_30_DISTRICTS.items():
        if q == name.lower() or q in name.lower() or name.lower() in q:
            return info
        if "hq" in info and q in info["hq"].lower():
            return info

    # 2. Alias match
    if q in DISTRICT_ALIASES:
        canonical = DISTRICT_ALIASES[q]
        return ODISHA_30_DISTRICTS.get(canonical)

    # 3. Sub-division / Town match (e.g. searching "Gunupur" -> Rayagada)
    for sub in ODISHA_SUBDIVISIONS:
        if q == sub["name"].lower() or q in sub["name"].lower() or sub["name"].lower() in q:
            return ODISHA_30_DISTRICTS.get(sub["district"])

    return None

def get_districts_list() -> List[Dict[str, Any]]:
    return [
        {
            "name": name,
            "lat": info["lat"],
            "lon": info["lon"],
            "elevation": info["elevation"],
            "coast_km": info["coast_km"]
        }
        for name, info in sorted(ODISHA_30_DISTRICTS.items(), key=lambda x: x[0])
    ]

