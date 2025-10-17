import React, { useEffect, useState } from "react";
import { getAdvertisements } from "../api/advertisement";

const AdsPage = () => {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await getAdvertisements();
        const data = res.data?.data?.advertisements || [];
        setAds(data);
      } catch (err) {
        console.error("Failed to fetch ads:", err);
      }
    };

    fetchAds();
  }, []);

  return (
    <>
      <div className='mt-30 ml-5 md:mt-40 md:ml-30 w-75 md:w-95 mb-8 fixed top-0'>
        <h1 className='text-[24px] md:text-[32px] font-medium text-[#252525] opacity-80'>
          Free Government Training and Certification
        </h1>
      </div>

      <div className="h-180 mt-55 md:h-120 md:mt-60 overflow-auto">
        {ads.map((ad) => (
          <a
            key={ad._id}
            href={ad.link}
            target="_blank"
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
        ))}
      </div>
    </>
  );
};

export default AdsPage;
