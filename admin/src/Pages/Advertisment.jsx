import React, { useState, useEffect } from "react";
import { checkAuth } from "../Api/auth";
import {
  getAdvertisements,
  addAdvertisement,
  deleteAdvertisement,
  updateAdvertisement,
} from "../Api/advertisment";

/* ========= Reusable Modals ========= */
const BaseModal = ({ open, onClose, children, widthClass = "max-w-lg" }) => {
  if (!open) return null;
  return (
    <div
  className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={onClose} // close when clicking outside the modal
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${widthClass} mx-4 z-10`}
        onClick={(e) => e.stopPropagation()} // prevent overlay clicks from closing modal
      >
        <div className="p-5">{children}</div>
        <div className="h-3" />
      </div>
    </div>
  );
};


const SuccessModal = ({ open, onClose, title = "Success", message = "" }) => (
  <BaseModal open={open} onClose={onClose}>
    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    {message && <p className="text-gray-600 mt-2">{message}</p>}
    <div className="mt-6 flex justify-end">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg bg-[#55b3f3] hover:bg-sky-700 text-white"
      >
        OK
      </button>
    </div>
  </BaseModal>
);

const ConfirmModal = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onCancel,
  onConfirm,
}) => (
  <BaseModal open={open} onClose={onCancel}>
    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
    {message && <p className="text-gray-600 mt-2">{message}</p>}
    <div className="mt-6 flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800"
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Deleting..." : confirmLabel}
      </button>
    </div>
  </BaseModal>
);

/* ========= Your Component ========= */
const Advertisement = () => {
  const [ads, setAds] = useState([]);
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editingAd, setEditingAd] = useState(null);

  // Modal state (success + delete confirm)
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch ads
  const fetchAds = async () => {
    try {
      const res = await getAdvertisements(`?t=${Date.now()}`);
      const data =
        res.data?.data?.advertisements ||
        res.data?.ads ||
        (Array.isArray(res.data) ? res.data : []);
      setAds(data);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      setAds([]);
    }
  };

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const res = await checkAuth();
        if (!res.data.isAuthenticated || res.data.admin.role !== "admin") {
          // Keep as an alert if you want, or turn it into a modal too.
          alert("You must be logged in as an admin to access advertisements");
        }
      } catch (err) {
        console.error("Auth check failed", err);
      }
    };

    verifyAdmin();
    fetchAds();
  }, []);

  // Add or Update Advertisement
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !companyName || !description || !link) {
      alert("Please fill all required fields");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("companyName", companyName);
    formData.append("description", description);
    formData.append("link", link);
    if (image) formData.append("image", image);

    try {
      setLoading(true);

      if (editingAd) {
        await updateAdvertisement(editingAd._id, formData);

        await fetchAds();

        // SUCCESS MODAL (Update)
        setSuccessMsg("Advertisement updated successfully.");
        setSuccessOpen(true);
      } else {
        const res = await addAdvertisement(formData);
        const newAd = res.data?.data;
        setAds((prev) => [newAd, ...prev]);

        // SUCCESS MODAL (Add)
        setSuccessMsg("Advertisement added successfully.");
        setSuccessOpen(true);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving advertisement:", error);
      alert(error.response?.data?.message || "Failed to save advertisement");
    } finally {
      setLoading(false);
    }
  };

  // Delete flow uses a confirmation modal
  const handleDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleteLoading(true);
      const res = await deleteAdvertisement(deleteId);

      if (res.data?.success) {
        // Remove locally (optional) or fetch again
        await fetchAds();

        setSuccessMsg("Advertisement deleted successfully.");
        setSuccessOpen(true);
      } else {
        alert(res.data?.message || "Failed to delete advertisement");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to delete advertisement");
    } finally {
      setDeleteLoading(false);
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };



  // Edit Advertisement
  const handleEdit = (ad) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setCompanyName(ad.companyName);
    setDescription(ad.description);
    setLink(ad.link);
    setImage(null);
  };

  // Reset Form
  const resetForm = () => {
    setTitle("");
    setCompanyName("");
    setDescription("");
    setLink("");
    setImage(null);
    setEditingAd(null);
  };

  return (
    <div className="p-4 sm:ml-64">
      <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Advertisement
        </h2>

        {/* Add / Edit Advertisement (unchanged form) */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 p-4 rounded-xl shadow mb-8 space-y-4"
        >
          <input
            type="text"
            placeholder="Title"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            type="text"
            placeholder="Company Name"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <textarea
            placeholder="Description"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full h-70"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            type="url"
            placeholder="Link"
            className="border border-gray-300 rounded-lg px-3 py-2 w-full"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />

          {/* Show existing image when editing */}
          {editingAd && editingAd.image?.url && !image && (
            <div className="mb-2">
              <p className="text-sm text-gray-500">Current image:</p>
              <img
                src={`${editingAd.image.url}?v=${Date.now()}`}
                alt="Current"
                className="w-70 h-70 object-cover rounded-lg mt-1"
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            className="w-full text-sm
              file:mr-4 file:py-2 file:px-4 
              file:rounded-lg file:border-0 
              file:text-sm file:font-medium 
              file:bg-[#55b3f3] file:text-white 
              hover:file:bg-sky-700 file:cursor-pointer"
            onChange={(e) => setImage(e.target.files[0])}
          />

          <button
            type="submit"
            className="bg-[#55b3f3] hover:bg-sky-700 text-white font-medium px-5 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : editingAd
                ? "Update Advertisement"
                : "Add Advertisement"}
          </button>

          {editingAd && (
            <button
              type="button"
              onClick={resetForm}
              className="ml-3 bg-gray-400 hover:bg-gray-500 text-white font-medium px-5 py-2 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
          )}
        </form>

        {/* Display Advertisements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ads.length > 0 ? (
            ads.map((ad) => (
              <div
                key={ad._id}
                className="bg-white border border-gray-200 rounded-2xl shadow hover:shadow-md transition flex flex-col items-center p-4"
              >
                <img
                  src={`${ad.imageUrl || ad.image?.url || "/placeholder.png"}?v=${ad.updatedAt || Date.now()}`}
                  alt={ad.title}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />

                <h3 className="text-lg font-semibold text-gray-800 text-center">
                  {ad.title}
                </h3>
                <p className="text-sm text-gray-500">{ad.companyName}</p>
                <p className="text-xs text-gray-400 line-clamp-2">
                  {ad.description}
                </p>
                {ad.link && (
                  <a
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-blue-600 hover:underline text-sm"
                  >
                    Visit
                  </a>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleEdit(ad)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-1.5 rounded-lg text-sm transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ad._id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No advertisements yet.</p>
          )}
        </div>
      </div>

      {/* ✅ Success Modal (Add / Update / Delete) */}
      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        message={successMsg}
      />

      {/* ✅ Delete Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete advertisement?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Advertisement;
