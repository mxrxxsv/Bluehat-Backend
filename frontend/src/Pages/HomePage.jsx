import { Link } from "react-router-dom";
import discover from '../assets/discovery.png';
import security from '../assets/security.png';
import connect from '../assets/connect.png';

const HomePage = () => {

    const features = [
        {
            title: 'Browse & Discover',
            description: 'Easily explore skilled workers by category, expertise, and location. Find the right person for the job in just a few clicks.',
            icon: discover,
        },
        {
            title: 'Connect',
            description: 'Seamlessly communicate with workers through our platform. Discuss job details, availability, and pricing before making a decision.',
            icon: connect,
        },
        {
            title: 'Secure & Reliable Hiring',
            description: 'Hire with confidence! Our platform verifies workers and ensures secure transactions for a hassle-free experience.',
            icon: security,
        },
    ];

    const categories = [
        "Construction & Renovation",
        "Repair & Maintenance",
        "Logistics & Transport",
        "Cleaning & Housekeeping",
        "Landscaping & Outdoor Work",
        "Factory & Industrial Work",
    ];

    return (
        <>

            <div className="relative w-full h-screen overflow-hidden">
                <div className="absolute bg-[#b8def79e] rounded-full 
                w-[130vw] h-[130vw] -left-[45vw] -top-[10vw] 
                md:w-[72vw] md:h-[72vw] md:-left-[20vw] md:-top-[27.5vw] ">
                </div>

                <div className="absolute bg-[#81c5f39e] rounded-full z-0
                w-[80vw] h-[80vw] left-[52vw] -top-[10vw] rotate-[1.14deg] 
                md:w-[83vw] md:h-[83vw] md:left-[23vw] md:-top-[55vw] ">
                </div>

                <p className='text-start text-[#252525] opacity-85 absolute z-10 font-semibold
                  -top-[-55vw] pl-6  text-[38px] w-80
                  md:-top-[-17vw] md:pl-24 md:text-[64px]  md:w-150' >
                    We connect skilled worker to help you
                </p>



                <p className='text-start text-[#252525] absolute font-light
                      -top-[-130vw] pl-6 w-80 text-[20px]
                      md:-top-[-30vw] md:left-[100vh] md:pl-24 md:w-120'>
                    Find high quality talent or open jobs that keep you in control.
                </p>

                <p className='text-start text-[#252525] absolute font-light opacity-80
                      -top-[-150vw] pl-6 w-80 text-[18px]
                      md:-top-[-35vw] md:left-[100vh] md:pl-24 md:w-120'>
                    I'm looking for
                </p>

                <Link to="/find-work" className='flex mt-165 mx-auto md:mt-0 md:mx-0 h-13 w-88 bg-[#FFFFFF] border-2 border-solid rounded-[20px] text-start pt-3 pl-4 shadow-md border-[#89A8B2] opacity-80
                           md:absolute
                           md:-top-[-38vw] md:left-[53.5vw] '>
                    {/* -top-[-160vw] left-[2vw] */}
                    Any Worker Field <span className='ml-45'>⋮</span>
                </Link>

            </div>

            <div className='relative bottom-[120px] md:bottom-0 text-center'>
                <h1 className=' text-[28px] md:text-[32px] text-[#252525] opacity-85 font-medium mb-4 mx-15 md:mx-0 '>Empowering Filipino
                    Blue-Collar Workers</h1>

                <p className='mx-5 md:mx-60 mb-15 text-[16px] md:text-[18px]'>A platform designed for Filipino blue-hat workers to
                    connect, showcase their skills, and find job opportunities. Engage in real-time chats, network with potential clients, and grow your professional reputation all in one place!</p>

            </div>

            <div className="relative bottom-[120px] md:bottom-0 mx-5 my-5 md:mx-20 md:my-15">
                <div className="bg-gradient-to-r from-white to-[#cfe8f7] p-6 rounded-xl shadow-md">
                    <div className="flex flex-col md:flex-row gap-6 justify-around items-center text-center">
                        {features.map((feature, index) => (
                            <div key={index} className="max-w-sm">
                                <img src={feature.icon} alt={feature.title} className="mx-auto mb-4 w-30 h-30" />
                                <h3 className="text-xl font-semibold mb-2 text-[#252525]">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="relative bottom-[120px] md:bottom-0 mx-5 my-5 md:mx-20 md:my-15">
                <div className="bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4 text-left">
                            Skilled Workers<br />for Every Job
                        </h2>
                        <p className="text-left sm:text-lg text-gray-600 mb-8 max-w-3xl">
                            Need a reliable professional? We’ve got you covered! Whether it’s fixing a leak, renovating a
                            space, or handling heavy lifting, our skilled blue-collar workers are ready to help. Explore a
                            wide range of services and find the right expert for the job.
                        </p>
                        <div className="flex flex-col sm:flex-wrap sm:flex-row sm:justify-start gap-4 items-start">
                            {categories.map((category, index) => (
                                <button
                                    key={index}
                                    className="border border-blue-300 text-gray-700 px-6 py-3 rounded-full hover:bg-blue-50 transition text-sm sm:text-base"
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </>
    );

};

export default HomePage;