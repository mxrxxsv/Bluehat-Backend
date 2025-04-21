import { Link } from "react-router-dom";

const HomePage = () => {

    return (
        <>

            <div className="relative w-full h-screen overflow-hidden">
                <div className="absolute bg-[#b8def79e] rounded-full 
                w-[130vw] h-[130vw] -left-[45vw] -top-[10vw] 
                md:w-[72vw] md:h-[72vw] md:-left-[20vw] md:-top-[25vw] ">
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

                <Link to="/find-work" className='absolute h-13 w-88 bg-[#FFFFFF] border-2 border-solid rounded-[20px] text-start pt-3 pl-4 shadow-md border-[#89A8B2] opacity-80
                           -top-[-160vw] left-[2vw]
                           md:-top-[-38vw] md:left-[53.5vw] '>
                    Any Worker Field <span className='ml-45'>⋮</span>
                </Link>

            </div>

            <div className='text-center'>
                <h1 className=' text-[28px] md:text-[32px] text-[#252525] opacity-85 font-medium mb-4 mx-10 md:mx-0 '>Empowering Filipino
                    Blue-Collar Workers</h1>

                <p className='mx-5 md:mx-50 mb-15'>A platform designed for Filipino blue-hat workers to
                    connect, showcase their skills, and find job opportunities. Engage in real-time chats, network with potential clients, and grow your professional reputation all in one place!</p>


            </div>

        </>
    );

};

export default HomePage;