import React, { useEffect, useState } from "react";
import axios from "axios";

const PHIL_API = "https://psgc.gitlab.io/api"; 

const AddressSelector = ({ formData, setFormData }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  useEffect(() => {
    axios.get(`${PHIL_API}/regions/`).then((res) => setRegions(res.data));
  }, []);

  const handleRegionChange = async (e) => {
    const regionCode = e.target.value;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, region: regionCode, province: "", city: "", district: "" },
    }));
    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (regionCode) {
      const res = await axios.get(`${PHIL_API}/regions/${regionCode}/provinces/`);
      setProvinces(res.data);
    }
  };

  const handleProvinceChange = async (e) => {
    const provCode = e.target.value;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, province: provCode, city: "", district: "" },
    }));
    setCities([]);
    setBarangays([]);

    if (provCode) {
      const res = await axios.get(`${PHIL_API}/provinces/${provCode}/cities-municipalities/`);
      setCities(res.data);
    }
  };

  const handleCityChange = async (e) => {
    const cityCode = e.target.value;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, city: cityCode, district: "" },
    }));
    setBarangays([]);

    if (cityCode) {
      const res = await axios.get(`${PHIL_API}/cities-municipalities/${cityCode}/barangays/`);
      setBarangays(res.data);
    }
  };

  const handleBarangayChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, district: e.target.value },
    }));
  };

  const handleStreetChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, street: e.target.value },
    }));
  };

  return (
   <>
      {/* Region */}
      <div>
        <label
          htmlFor="region"
          className="block mb-2 text-sm font-medium text-gray-900 text-left"
        >
          Region
        </label>
        <select
          id="region"
          value={formData.address.region}
          onChange={handleRegionChange}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
          required
        >
          <option value="">Select Region</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Province */}
      <div>
        <label
          htmlFor="province"
          className="block mb-2 text-sm font-medium text-gray-900 text-left"
        >
          Province
        </label>
        <select
          id="province"
          value={formData.address.province || ""}
          onChange={handleProvinceChange}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
          required
        >
          <option value="">Select Province</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label
          htmlFor="city"
          className="block mb-2 text-sm font-medium text-gray-900 text-left"
        >
          City / Municipality
        </label>
        <select
          id="city"
          value={formData.address.city}
          onChange={handleCityChange}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
          required
        >
          <option value="">Select City</option>
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Barangay */}
      <div>
        <label
          htmlFor="district"
          className="block mb-2 text-sm font-medium text-gray-900 text-left"
        >
          Barangay
        </label>
        <select
          id="district"
          value={formData.address.district}
          onChange={handleBarangayChange}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
          required
        >
          <option value="">Select Barangay</option>
          {barangays.map((b) => (
            <option key={b.code} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Street */}
      <div className="md:col-span-2">
        <label
          htmlFor="street"
          className="block mb-2 text-sm font-medium text-gray-900 text-left"
        >
          Street
        </label>
        <input
          type="text"
          id="street"
          value={formData.address.street}
          onChange={handleStreetChange}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition"
          placeholder="Street"
          required
        />
      </div>
</>
  );
};

export default AddressSelector;
