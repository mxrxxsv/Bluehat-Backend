const workers = [
  {
    id: 1,
    name: "Juan Dela Cruz",
    age: 35,
    gender: "Male",
    description:
      "An experienced electrician with over 10 years in residential and commercial electrical works.",
    location: "Quezon City",
    profileImage: "/images/juan.jpg",
    skills: [
      "Wiring",
      "Circuit Repair",
      "Solar Panel Installation",
      "Generator Maintenance",
    ],
    experience: [
      {
        company: "BrightVolt Electrical Services",
        years: "2019 - 2024",
        position: "Lead Electrician",
        description:
          "Managed large-scale installations and led a team of junior electricians.",
      },
      {
        company: "SolarPros PH",
        years: "2016 - 2019",
        position: "Solar Technician",
        description:
          "Specialized in rooftop solar installations and maintenance.",
      },
    ],
    reviews: [
      {
        clientName: "Anna Reyes",
        skill: "Wiring",
        rating: 5,
        comment: "Very neat and professional work. Highly recommended!",
        clientImage: "/images/anna.jpg",
      },
      {
        clientName: "Mark Tan",
        skill: "Solar Panel Installation",
        rating: 4,
        comment: "Explained everything clearly. Efficient work.",
        clientImage: "/images/mark.jpg",
      },
    ],
  },
  {
    id: 2,
    name: "Maria Santos",
    age: 29,
    gender: "Female",
    description:
      "A skilled plumber focused on residential maintenance and emergency pipe repairs.",
    location: "Makati City",
    profileImage: "/images/maria.jpg",
    skills: ["Pipe Repair", "Drain Cleaning", "Water Heater Installation"],
    experience: [
      {
        company: "AquaFix PH",
        years: "2020 - 2025",
        position: "Senior Plumber",
        description:
          "Handled urgent pipe leaks, bathroom remodels, and heating systems.",
      },
      {
        company: "HomeFixers",
        years: "2017 - 2020",
        position: "Junior Plumber",
        description:
          "Assisted with various plumbing installations and learned diagnostics.",
      },
    ],
    reviews: [
      {
        clientName: "Luis Gomez",
        skill: "Pipe Repair",
        rating: 5,
        comment: "Quick response and solved a major leak on the same day!",
        clientImage: "/images/luis.jpg",
      },
      {
        clientName: "Jenny Alvarado",
        skill: "Drain Cleaning",
        rating: 4,
        comment: "Very courteous and left the place clean after the job.",
        clientImage: "/images/jenny.jpg",
      },
    ],
  },
  {
    id: 3,
    name: "Chlyde Adrian Benavidez",
    age: 12,
    gender: "Male",
    description:
      "Professional carpenter with a focus on custom furniture and home repairs.",
    location: "Manila",
    profileImage: "/images/carlos.jpg",
    skills: [
      "Woodwork",
      "Cabinet Making",
      "Door and Window Repair",
      "Furniture Assembly",
    ],
    experience: [
      {
        company: "CraftHaus Carpentry",
        years: "2021 - 2025",
        position: "Custom Carpenter",
        description:
          "Built custom shelves, dining sets, and refurbished antique furniture.",
      },
      {
        company: "HomeServe Carpentry",
        years: "2018 - 2021",
        position: "Maintenance Carpenter",
        description:
          "Repaired doors, windows, and assembled flat-pack furniture.",
      },
    ],
    reviews: [
      {
        clientName: "Ella Cruz",
        skill: "Furniture Assembly",
        rating: 1,
        comment: "Fast and reliable. My bookshelf looks great!",
        clientImage: "/images/ella.jpg",
      },
      {
        clientName: "Miguel Torres",
        skill: "Cabinet Making",
        rating: 1,
        comment: "Beautiful craftsmanship. Worth every peso.",
        clientImage: "/images/miguel.jpg",
      },
    ],
  },
];

export default workers;
