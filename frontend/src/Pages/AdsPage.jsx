import adPost from "../Objects/advertisement.js";

const AdsPage = () => {
  return (
    <>
      <div className='mt-30 ml-5 md:mt-40 md:ml-30 w-75 md:w-95 mb-8 fixed top-0'>
        <h1 className='text-[24px] text-left md:text-[32px] font-medium text-[#252525] opacity-80' >Free Government Training
          and Certification</h1>
      </div>


      <div className="h-180 mt-55 md:h-120 md:mt-60 overflow-auto">
      {adPost.map((ad) => {
        return (
          <a key={ad.id}
            href={ad.link}
            className="flex flex-col md:mx-auto items-center bg-white rounded-lg shadow-md md:flex-row md:max-w-xl hover:bg-gray-100 mt-6 mx-6 text-left mb-8">
              <div className="flex flex-col justify-between p-4 leading-normal">
              <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-[#252525] opacity-80">{ad.title}</h5>
              <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{ad.description}</p>
            </div>
            <img className="object-cover w-60 rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-s-lg"
              src={ad.image} alt="" />
            
          </a>
        )
      })}
      </div>

    </>
  );
};

export default AdsPage;
