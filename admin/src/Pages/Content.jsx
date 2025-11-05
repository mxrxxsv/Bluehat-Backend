import { useEffect, useState } from "react";
import {
  getAllSkills,
  addSkill,
  updateSkill,
  deleteSkill,
} from "../Api/skillApi";

const Content = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showSkills, setShowSkills] = useState(true);

  // ✅ Fetch skill categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await getAllSkills();
      if (res.data.success) {
        setCategories(res.data.data.categories.filter((cat) => !cat.isDeleted));
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching categories");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Skill CRUD
  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await addSkill({ categoryName: newCategoryName });
      if (res.data.success) {
        setNewCategoryName("");
        setShowAddModal(false);
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create category");
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !editCategoryName.trim()) return;
    try {
      const res = await updateSkill(selectedCategory._id, {
        categoryName: editCategoryName,
      });
      if (res.data.success) {
        fetchCategories();
        setSelectedCategory(null);
        setEditCategoryName("");
        setShowEditModal(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update category");
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await deleteSkill(categoryToDelete._id);
      if (res.data.success) {
        setCategories((prev) =>
          prev.filter((cat) => cat._id !== categoryToDelete._id)
        );
        setCategoryToDelete(null);
        setShowDeleteModal(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <div className="p-4 sm:ml-64">
      {/* === Skills Section === */}
      <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl shadow-md mb-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Skill Categories</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSkills(!showSkills)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition duration-200 cursor-pointer"
            >
              {showSkills ? "Hide Skills" : "Show Skills"}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#55b3f3] text-white rounded-xl hover:bg-sky-700 transition duration-200 cursor-pointer"
            >
              Add Skill
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading categories...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          showSkills && (
            <ul className="space-y-3">
              {categories.map((cat) => (
                <li
                  key={cat._id}
                  className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition duration-200"
                >
                  <span className="text-gray-700 font-medium">
                    {cat.categoryName}
                  </span>
                  <div className="flex gap-3">
                    <button
                      className="text-[#55b3f3] font-semibold hover:underline cursor-pointer"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setEditCategoryName(cat.categoryName);
                        setShowEditModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 font-semibold hover:underline cursor-pointer"
                      onClick={() => {
                        setCategoryToDelete(cat);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* === Modals (Add/Edit/Delete for Skills) === */}
      {showAddModal && (
        <Modal title="Add New Skill" onClose={() => setShowAddModal(false)}>
          <input
            type="text"
            placeholder="Skill category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 transition duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#55b3f3] text-white rounded-xl hover:bg-sky-700 transition duration-200 cursor-pointer"
            >
              Add
            </button>
          </div>
        </Modal>
      )}

      {showEditModal && selectedCategory && (
        <Modal title="Edit Skill" onClose={() => setShowEditModal(false)}>
          <input
            type="text"
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 transition duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition duration-200 cursor-pointer"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {showDeleteModal && categoryToDelete && (
        <Modal title="Confirm Delete" onClose={() => setShowDeleteModal(false)}>
          <p className="mb-4">
            Are you sure you want to delete "{categoryToDelete.categoryName}"?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl hover:bg-gray-400 transition duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition duration-200 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Reusable Modal
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-[#f4f6f6] bg-opacity-50 flex justify-center items-center z-[2000]">
    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-500 font-bold text-xl cursor-pointer"
        >
          &times;
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default Content;
