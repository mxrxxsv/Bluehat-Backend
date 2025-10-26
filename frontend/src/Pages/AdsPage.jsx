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
        <div className='mt-30 ml-5 md:mt-40 md:ml-30 w-75 md:w-95 mb-8 fixed top-0'>
          <div className="h-8 md:h-10 bg-gray-200 rounded w-3/4 md:w-1/2 animate-pulse" />
        </div>

        <div className="h-180 mt-55 md:h-120 md:mt-60 overflow-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col md:mx-auto items-center bg-white rounded-lg shadow-md md:flex-row md:max-w-xl mt-6 mx-6 text-left mb-8 animate-pulse"
            >
              <div className="flex flex-col justify-between p-4 leading-normal w-full">
                <div className="mb-2 h-6 bg-gray-200 rounded w-2/3" />
                <div className="mb-2 h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
              <div className="w-full md:w-50 md:m-2">
                <div className="object-cover w-full h-100 md:h-80 bg-gray-200 rounded-[10px]" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className='mt-30 ml-5 md:mt-40 md:ml-30 w-75 md:w-95 mb-8 fixed top-0'>
        <h1 className='text-[24px] md:text-[32px] font-medium text-[#252525] opacity-80'>
          Free Government Training and Certifications
        </h1>
      </div>

      <div className="h-180 mt-55 md:h-120 md:mt-60 overflow-auto">
        {ads.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl text-gray-400">📭</span>
              </div>
              <p className="text-gray-500">No advertisements available right now.</p>
              <p className="text-gray-400 text-sm">Please check back later.</p>
            </div>
          </div>
        ) : (
          ads.map((ad) => (
            <a
              key={ad._id}
              href={ad.link}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col md:mx-auto items-center bg-white rounded-lg shadow-md md:flex-row md:max-w-xl hover:bg-gray-100 mt-6 mx-6 text-left mb-8"
            >
              <div className="flex flex-col justify-between p-4 leading-normal">
                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-[#252525] opacity-80">
                  {ad.title}
                </h5>
                <p className="mb-3 font-normal text-gray-700">
                  {ad.description}
                </p>
              </div>
              <img
                className="object-cover w-full h-100 md:h-80 md:w-50 md:m-2 rounded-[10px]"
                src={ad.image?.url || "/placeholder.png"}
                alt={ad.title}
              />
            </a>
          ))
        )}
      </div>
    </>
  );
};

export default AdsPage;
