// src/components/AddSkill.jsx
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { addSkillCategory } from "../api/profile";
import { getProfile } from "../api/profile";
import { baseURL } from "../utils/appMode";

const AddSkill = ({ onClose, onAdd }) => {
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get user (so we have userId)
  useEffect(() => {
    getProfile()
      .then((res) => {
        const user = res.data.data;
        setCurrentUser({
          credentialId: user.id,
          profileId: user.profileId,
        });
      })
      .catch(() => setCurrentUser(null));
  }, []);

  // Fetch available skills
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch(`${baseURL}/skills`);
        const data = await res.json();
        setAvailableSkills(
          Array.isArray(data?.data?.categories) ? data.data.categories : []
        );
      } catch (err) {
        console.error("Error fetching skills:", err);
      }
    };
    fetchSkills();
  }, []);

  // Toggle skill selection
  const toggleSkill = (id) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Submit skills
  const handleAddSkills = async () => {
    if (!currentUser || selectedSkills.length === 0) return;

    try {
      setLoading(true);
      setError("");

      for (const id of selectedSkills) {
        const data = { skillCategoryId: id, userId: currentUser.credentialId };
        await addSkillCategory(data);
      }

      onAdd(selectedSkills); // send back to parent
      setSelectedSkills([]);
      onClose();
    } catch (err) {
      console.error("Error adding skills:", err);
      setError(err.response?.data?.message || "Failed to add skills.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Main Add Skill Modal */}
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
        <div className="bg-white rounded-2xl p-6 w-96 relative shadow-lg">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-semibold mb-4">Add Skills</h2>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {/* Skill Selection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {availableSkills.map((skill) => (
              <button
                key={skill._id}
                onClick={() => toggleSkill(skill._id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedSkills.includes(skill._id)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {skill.name || skill.categoryName}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleAddSkills}
            disabled={loading || selectedSkills.length === 0}
            className="w-full bg-[#55b3f3] text-white py-2 rounded-lg hover:bg-blue-400 mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Skills"}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddSkill;
