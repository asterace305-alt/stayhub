const express = require('express');
const { rankPGs } = require('./utils/scoringEngine');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'StayHub backend is running!' });
});

app.get('/api/listings', (req, res) => {
    const listings = [
        {
            id: 1,
            name: "Alchemy Living",
            area: "Kapil Nagar, Kondhwa",
            distance: 0.95,
            rent: 10000,
            deposit: 10000,
            sharing: "Single",
            gender: "Male",
            food: true,
            wifi: 20,
            ac: false,
            curfew: "no_curfew",
            amenities: ["Laundry"],
            tier: "basic",
            verified: false
        },
        {
            id: 2,
            name: "Casa Living: Iris House",
            area: "Betal Nagar",
            distance: 0.64,
            rent: 8500,
            deposit: 8500,
            sharing: "Double/Triple",
            gender: "Female",
            food: false,
            wifi: 20,
            ac: false,
            curfew: "no_curfew",
            amenities: ["Furnished Rooms", "Laundry", "Wi-Fi", "CCTV"],
            tier: "basic",
            verified: false
        },
        {
            id: 3,
            name: "Studious Girls Hostel",
            area: "Kondhwa",
            distance: 0.85,
            rent: 7500,
            deposit: 0,
            sharing: "Double/Triple",
            gender: "Female",
            food: false,
            wifi: 20,
            ac: false,
            curfew: "no_curfew",
            amenities: ["Study Room", "Wi-Fi", "CCTV", "Washing Machine"],
            tier: "basic",
            verified: false
        }
    ];
    res.json(listings);
});

app.post('/api/fitscore', (req, res) => {
    const { budget, max_distance, needs_food, curfew, gender, priorities, campus } = req.body;

    const studentPrefs = {
        budget: budget,
        max_distance: max_distance,
        needs_food: needs_food,
        curfew: curfew,
        gender: gender,
        priorities: priorities || ['food', 'distance', 'budget', 'curfew', 'wifi']
    };

    const allPGs = [
        {
            name: "Alchemy Living",
            area: "Kapil Nagar, Kondhwa",
            rent: 10000,
            food: true,
            wifi: true,
            curfew: "no_curfew",
            occupantType: "male",
            distance_bibwewadi: 3.0,
            distance_kondhwa: 0.95,
            tier: "basic"
        },
        {
            name: "Casa Living: Iris House",
            area: "Betal Nagar",
            rent: 8500,
            food: false,
            wifi: true,
            curfew: "no_curfew",
            occupantType: "female",
            distance_bibwewadi: 2.89,
            distance_kondhwa: 0.64,
            tier: "basic"
        },
        {
            name: "Studious Girls Hostel",
            area: "Kondhwa",
            rent: 7500,
            food: false,
            wifi: true,
            curfew: "moderate",
            occupantType: "female",
            distance_bibwewadi: 2.9,
            distance_kondhwa: 0.85,
            tier: "basic"
        }
    ];

    const results = rankPGs(studentPrefs, allPGs, campus || 'kondhwa');
    res.json(results);
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
