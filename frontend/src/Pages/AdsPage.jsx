import React, { useEffect, useState } from "react";
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

  if (loading) {
    return (
      <>
        <div className="mt-30 md:mt-40 mb-6 max-w-6xl mx-auto px-4">
          <div className="h-8 md:h-10 bg-gray-200 rounded w-3/4 md:w-1/2 animate-pulse" />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow overflow-hidden flex flex-col animate-pulse">
                <div className="relative w-full h-44 sm:h-48 lg:h-44 bg-gray-200" />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="h-6 md:h-7 bg-gray-200 rounded w-5/6 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-11/12 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-30 md:mt-40 mb-6 max-w-6xl mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#252525] opacity-80">
          Free Government Training and Certifications
        </h1>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {ads.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-center">
            <div>
              <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl text-gray-400">📭</span>
              </div>
              <p className="text-gray-500">No advertisements available right now.</p>
              <p className="text-gray-400 text-sm">Please check back later.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <a
                key={ad._id}
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden flex flex-col"
              >
                <div className="relative w-full h-44 sm:h-48 lg:h-44 bg-gray-100">
                  <img
                    className="absolute inset-0 w-full h-full object-cover"
                    src={ad.image?.url || "/placeholder.png"}
                    alt={ad.title}
                    loading="lazy"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col text-left">
                  <h5 className="text-lg md:text-xl font-bold tracking-tight text-[#252525] opacity-90 group-hover:opacity-100 line-clamp-2">
                    {ad.title}
                  </h5>
                  <p className="mt-2 text-gray-700 text-sm md:text-base line-clamp-3">
                    {ad.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AdsPage;
