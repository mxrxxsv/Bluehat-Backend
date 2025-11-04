import React, { useState } from "react";

// Props:
// - shape: 'rect' | 'circle' (default 'rect')
// - sizeClass: Tailwind size classes for circle (e.g., 'w-28 h-28')
// - showInlinePreview: whether to render preview inside the dropzone (default true)
// - dropClassName: additional classes for drop area
const DropzoneFileInput = ({
  onFileSelect,
  accept = "image/*",
  label,
  shape = "rect",
  sizeClass = "w-28 h-28",
  showInlinePreview = true,
  dropClassName = "",
}) => {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onFileSelect(file);
      setFileName(file.name);

      // Show preview if image
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null); // not an image
      }
    }
  };

  const baseRect =
    "flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative";
  const baseCircle = `flex items-center justify-center ${sizeClass} rounded-full border-2 border-dashed border-gray-300 cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden`;

  const labelClass = `${shape === "circle" ? baseCircle : baseRect} ${dropClassName}`;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <label htmlFor={label} className={labelClass}>
        {!preview ? (
          <div className={`flex flex-col items-center justify-center ${shape === "circle" ? "text-center" : "pt-5 pb-6 text-center"}`}>
            <svg
              className={`${shape === "circle" ? "w-6 h-6" : "w-8 h-8 mb-3"} text-gray-500`}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            {shape !== "circle" && (
              <>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  {accept.includes("image") ? "PNG, JPG, GIF" : "PDF, DOC, etc."}
                </p>
              </>
            )}
          </div>
        ) : (
          showInlinePreview && (
            <div className={`flex flex-col items-center ${shape === "circle" ? "w-full h-full" : ""}`}>
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className={`${shape === "circle" ? "w-full h-full object-cover" : "h-24 object-contain mb-2 rounded"}`}
                />
              ) : null}
              {shape !== "circle" && (
                <p className="text-xs text-gray-600 truncate max-w-[200px]">{fileName}</p>
              )}
            </div>
          )
        )}
        <input id={label} type="file" className="hidden" accept={accept} onChange={handleFileChange} />
      </label>
      {shape !== "circle" && preview && (
        <p className="mt-2 text-xs text-gray-600 truncate max-w-full">{fileName}</p>
      )}
    </div>
  );
};

export default DropzoneFileInput;
