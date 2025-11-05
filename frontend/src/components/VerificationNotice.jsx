import React from "react";
import { ShieldAlert } from "lucide-react";

const VerificationNotice = ({ user }) => {
    // Show only for workers who are not yet verified
    if (!user || user.userType !== "worker" || user.isVerified) return null;

    // Heuristics: if the worker has submitted any verification docs (ID/selfie), show a pending message
    const hasSubmittedVerification = Boolean(
        user?.idPictureId || user?.selfiePictureId || user?.idPicture || user?.selfiePicture
    );

    const message = hasSubmittedVerification
        ? "Thanks! Your verification is being reviewed. Please wait while we verify your details."
        : "You’re not verified yet. Please complete verification.";

    return (
        <div
            className="
                fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[2000]
                bg-yellow-100 text-yellow-800 border border-yellow-400
                px-4 py-3 rounded-lg shadow-md flex items-center gap-2
                sm:px-4 sm:py-3 sm:gap-2 sm:text-sm
                px-2 py-2 gap-1 text-xs
            "
        >
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            <span className="font-medium">{message}</span>
        </div>
    );
};

export default VerificationNotice;
