import React from "react";
import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";

const NotificationModal = ({
  isOpen,
  onClose,
  type = "info",
  title,
  message,
  onConfirm = null,
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "error":
        return <XCircle className="w-12 h-12 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-12 h-12 text-yellow-500" />;
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          button: "bg-green-500 hover:bg-green-600 focus:ring-green-500",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          button: "bg-red-500 hover:bg-red-600 focus:ring-red-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          button: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500",
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          button: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500",
        };
    }
  };

  const colors = getColors();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-[#545454]">
              {title ||
                (type === "success"
                  ? "Success"
                  : type === "error"
                  ? "Error"
                  : type === "warning"
                  ? "Warning"
                  : "Information")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 ${colors.bg} ${colors.border} border-l-4`}>
          <p className="text-[#545454] text-center leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 bg-gray-50 rounded-b-xl">
          {showCancel && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${colors.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
