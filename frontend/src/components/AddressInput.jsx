// components/AddressInput.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const PHIL_API = "https://psgc.gitlab.io/api";

const AddressInput = ({ value, onChange }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  // Load regions
  useEffect(() => {
    axios.get(`${PHIL_API}/regions.json`).then((res) => setRegions(res.data));
  }, []);

  // Load provinces
  useEffect(() => {
    if (selectedRegion) {
      axios
        .get(`${PHIL_API}/regions/${selectedRegion}/provinces.json`)
        .then((res) => setProvinces(res.data))
        .catch(() => setProvinces([]));
      setSelectedProvince("");
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
    }
  }, [selectedRegion]);

  // Load cities
  useEffect(() => {
    if (selectedProvince) {
      axios
        .get(`${PHIL_API}/provinces/${selectedProvince}/cities-municipalities.json`)
        .then((res) => setCities(res.data))
        .catch(() => setCities([]));
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
    }
  }, [selectedProvince]);

  // Load barangays
  useEffect(() => {
    if (selectedCity) {
      axios
        .get(`${PHIL_API}/cities-municipalities/${selectedCity}/barangays.json`)
        .then((res) => setBarangays(res.data))
        .catch(() => setBarangays([]));
      setSelectedBarangay("");
    }
  }, [selectedCity]);

  // Update full address
  useEffect(() => {
    const fullAddress = [
      selectedBarangay
        ? barangays.find((b) => b.code === selectedBarangay)?.name
        : "",
      selectedCity ? cities.find((c) => c.code === selectedCity)?.name : "",
      // selectedProvince ? provinces.find((p) => p.code === selectedProvince)?.name : "",
      // selectedRegion ? regions.find((r) => r.code === selectedRegion)?.name : "",
    ]
      .filter(Boolean)
      .join(", ");
    onChange(fullAddress);
  }, [selectedRegion, selectedProvince, selectedCity, selectedBarangay, barangays, cities, provinces, regions]);

  return (
    <div className="space-y-2">
      {/* Region */}
      <select
        value={selectedRegion}
        onChange={(e) => setSelectedRegion(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500"
      >
        <option value="">Select Region</option>
        {regions.map((r) => (
          <option key={r.code} value={r.code} className="text-black">
            {r.name}
          </option>
        ))}
      </select>

      {/* Province */}
      <select
        value={selectedProvince}
        onChange={(e) => setSelectedProvince(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500"
        disabled={!provinces.length}
      >
        <option value="">Select Province</option>
        {provinces.map((p) => (
          <option key={p.code} value={p.code} className="text-black">
            {p.name}
          </option>
        ))}
      </select>

      {/* City */}
      <select
        value={selectedCity}
        onChange={(e) => setSelectedCity(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500"
        disabled={!cities.length}
      >
        <option value="">Select City/Municipality</option>
        {cities.map((c) => (
          <option key={c.code} value={c.code} className="text-black">
            {c.name}
          </option>
        ))}
      </select>

      {/* Barangay */}
      <select
        value={selectedBarangay}
        onChange={(e) => setSelectedBarangay(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500"
        disabled={!barangays.length}
      >
        <option value="">Select Barangay</option>
        {barangays.map((b) => (
          <option key={b.code} value={b.code} className="text-black">
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AddressInput;
