import React, { useEffect, useMemo, useState } from "react";
import { getAdvertisements } from "../api/advertisement";

const AdsPage = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        const res = await getAdvertisements();
        const data = res.data?.data?.advertisements || [];
        setAds(data);
      } catch (err) {
        console.error("Failed to fetch ads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  // Helpers
  const timeAgo = (iso) => {
    if (!iso) return "";
    const now = new Date();
    const then = new Date(iso);
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  const getDomain = (url) => {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  const adsPrepared = useMemo(
    () =>
      (ads || []).map((ad) => ({
        ...ad,
        domain: getDomain(ad.link),
        postedAgo: timeAgo(ad.createdAt),
      })),
    [ads]
  );

  if (loading) {
    return (
      <>
        <div className="mt-25 md:mt-35 mb-6 max-w-2xl mx-auto px-4">
          <div className="h-8 md:h-10 bg-gray-200 rounded w-64 md:w-80 animate-pulse" />
        </div>

        <div className="max-w-2xl mx-auto px-4">
          <ul className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="p-4">
                  {/* Title */}
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  {/* Meta row (company, domain, posted) */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </div>
                  {/* Body lines */}
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-11/12 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
                <div className="relative w-full h-48 sm:h-56 md:h-64 bg-gray-200 border-t border-gray-100" />
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 w-full">
                  {/* Source badge */}
                  <div className="h-5 bg-gray-200 rounded-full w-24" />
                  {/* Right-aligned action link */}
                  <div className="ml-auto h-4 bg-gray-200 rounded w-24" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-30 md:mt-35 mb-6 max-w-2xl mx-auto px-4 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-[#252525] opacity-90">
          Free Government Training and Certifications
        </h1>
        <p className="text-gray-600 mt-1">Opportunities shared by trusted organizations and partners</p>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {adsPrepared.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-center">
            <div>
              <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl text-gray-400">📭</span>
              </div>
              <p className="text-gray-500">No job posts available right now.</p>
              <p className="text-gray-400 text-sm">Please check back later.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-4 stagger-children">
            {adsPrepared.map((ad) => (
              <li key={ad._id} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
                {/* Content (text first like FB) */}
                <div className="p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg md:text-xl font-semibold text-[#252525] leading-snug">
                      {ad.title}
                    </h3>
                    {ad.isActive === false && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Closed
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {ad.companyName && (
                      <span className="font-medium text-gray-700">{ad.companyName}</span>
                    )}
                    {ad.domain && (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        {ad.domain}
                      </span>
                    )}
                    {ad.postedAgo && (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        Posted {ad.postedAgo}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-gray-700 text-sm md:text-[15px] leading-relaxed text-left">
                    {ad.description}
                  </p>
                </div>

                {/* Image at the bottom like FB */}
                <div className="relative w-full h-48 sm:h-56 md:h-64 bg-gray-100 flex items-center justify-center p-2 border-t border-gray-100">
                  <img
                    src={ad.image?.url || "/placeholder.png"}
                    alt={ad.title}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Footer actions below image */}
                <div className="px-4 md:px-5 py-3 border-t border-gray-100 flex items-center gap-3 w-full">
                  {ad.domain && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full border text-xs text-gray-600 border-gray-200 bg-gray-50">
                      Source: {ad.domain}
                    </span>
                  )}
                  <a
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[#55b3f3] hover:text-sky-600 hover:underline font-medium"
                  >
                    View posting
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default AdsPage;
