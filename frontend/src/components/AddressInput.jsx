import { useState, useEffect } from "react";
import axios from "axios";

const PHIL_API = "https://psgc.gitlab.io/api";

const AddressInput = ({ value = "", onChange }) => {
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const REGION_CODE = "030000000"; // Region III (Central Luzon)
  const PROVINCE_CODE = "034900000"; // Nueva Ecija

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  // Load cities/municipalities of Nueva Ecija
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get(
          `${PHIL_API}/provinces/${PROVINCE_CODE}/cities-municipalities.json`
        );
        setCities(res.data);

        // ✅ Optional: Auto-select Cabiao by default
        const cabiao = res.data.find((c) => c.name === "CABIAO");
        if (cabiao) setSelectedCity(cabiao.code);
      } catch (err) {
        console.error("Failed to load cities:", err);
        setCities([]);
      }
    };
    fetchCities();
  }, []);

  // Load barangays for selected city
  useEffect(() => {
    const fetchBarangays = async () => {
      if (!selectedCity) {
        setBarangays([]);
        return;
      }
      try {
        const res = await axios.get(
          `${PHIL_API}/cities-municipalities/${selectedCity}/barangays.json`
        );
        setBarangays(res.data);
      } catch (err) {
        console.error("Failed to load barangays:", err);
        setBarangays([]);
      }
    };
    fetchBarangays();
  }, [selectedCity]);

  // ✅ Only update parent when address changes — not on every render
  useEffect(() => {
    if (!onChange) return;

    const cityName = cities.find((c) => c.code === selectedCity)?.name || "";
    const barangayName =
      barangays.find((b) => b.code === selectedBarangay)?.name || "";

    const fullAddress = [barangayName, cityName,]
      .filter(Boolean)
      .join(", ");

    onChange(fullAddress); // updates parent only when city or barangay changes
  }, [selectedCity, selectedBarangay]);

  return (
    <div className="space-y-2">
      {/* City */}
      <select
        value={selectedCity}
        onChange={(e) => setSelectedCity(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
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
        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
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
