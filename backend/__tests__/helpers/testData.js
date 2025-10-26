const bcrypt = require("bcryptjs");

// Mock user credentials
const mockCredentials = {
  worker: {
    email: "testworker@test.com",
    password: "Test@123456",
    hashedPassword: null, // Will be generated
  },
  client: {
    email: "testclient@test.com",
    password: "Test@123456",
    hashedPassword: null,
  },
};

// Generate hashed passwords
const initializeMockData = async () => {
  mockCredentials.worker.hashedPassword = await bcrypt.hash(
    mockCredentials.worker.password,
    10
  );
  mockCredentials.client.hashedPassword = await bcrypt.hash(
    mockCredentials.client.password,
    10
  );
};

// Mock worker data
const mockWorkerData = {
  firstName: "John",
  lastName: "Doe",
  phoneNumber: "09123456789",
  contactNumber: "09123456789",
  sex: "male",
  dateOfBirth: "1990-01-01",
  maritalStatus: "single",
  address: {
    region: "National Capital Region (NCR)",
    province: "Metro Manila",
    city: "Quezon City",
    barangay: "Barangay 123",
    street: "Test Street 123",
  },
  profilePicture: {
    url: "https://example.com/profile.jpg",
    public_id: "test_profile_id",
  },
  biography: "Test bio",
  skillsByCategory: [],
  education: [],
  experience: [],
  portfolio: [],
  certificates: [],
  rating: 0,
  reviews: [],
};

// Mock client data
const mockClientData = {
  firstName: "Jane",
  lastName: "Smith",
  phoneNumber: "09987654321",
  contactNumber: "09987654321",
  sex: "female",
  dateOfBirth: "1992-05-15",
  maritalStatus: "single",
  address: {
    region: "National Capital Region (NCR)",
    province: "Metro Manila",
    city: "Manila",
    barangay: "Barangay 456",
    street: "Test Avenue 456",
  },
  profilePicture: {
    url: "https://example.com/profile2.jpg",
    public_id: "test_profile_id_2",
  },
  biography: "Test client bio",
  education: [],
};

// Mock education data
const mockEducation = {
  schoolName: "Test University",
  educationLevel: "College",
  degree: "BS Computer Science",
  fieldOfStudy: "Computer Science",
  startDate: "2020-08-01",
  endDate: "2024-05-15",
  educationStatus: "Graduated",
  description: "Test description",
};

// Mock skill category
const mockSkillCategory = {
  categoryName: "Programming",
};

// Mock experience data
const mockExperience = {
  companyName: "Test Company",
  position: "Software Developer",
  startYear: "2020",
  endYear: "2024",
  description: "Test work experience",
  responsibilities: "Development and testing",
};

module.exports = {
  mockCredentials,
  mockWorkerData,
  mockClientData,
  mockEducation,
  mockSkillCategory,
  mockExperience,
  initializeMockData,
};
