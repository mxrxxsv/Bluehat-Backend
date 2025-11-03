import { useEffect, useState } from "react";
import discover from '../assets/discovery.png';
import security from '../assets/security.png';
import connect from '../assets/connect.png';
import desktopSrc from '../assets/desktop.png';
import mobileSrc from '../assets/mobile.jpg';

// Watch demo URL: set your YouTube video link here (code-defined, no UI input)
// Example: https://www.youtube.com/watch?v=XXXXXXXXXXX
const DEMO_URL = "https://youtu.be/_Z-oh_dI15w";

// Convert a YouTube link (watch, share, or embed) into an embeddable URL
const toYouTubeEmbed = (url) => {
    if (!url) return "";
    try {
        const u = new URL(url);
        // youtu.be/<id>
        if (u.hostname.includes('youtu.be')) {
            const id = u.pathname.replace('/', '');
            return id ? `https://www.youtube.com/embed/${id}` : "";
        }
        // youtube.com/watch?v=<id>
        if (u.searchParams.has('v')) {
            const id = u.searchParams.get('v');
            return id ? `https://www.youtube.com/embed/${id}` : "";
        }
        // youtube.com/embed/<id>
        if (u.pathname.startsWith('/embed/')) {
            return url;
        }
        return "";
    } catch {
        return "";
    }
};

const HomePage = () => {
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const embedUrl = toYouTubeEmbed(DEMO_URL);

    useEffect(() => {
        const els = Array.from(document.querySelectorAll('.home-reveal'));
        if (!('IntersectionObserver' in window) || els.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Enter viewport: show
                        entry.target.classList.add('reveal-visible');
                    } else {
                        // Exit viewport: reset so it animates again next time
                        entry.target.classList.remove('reveal-visible');
                    }
                });
            },
            { root: null, rootMargin: '0px', threshold: 0.12 }
        );

        els.forEach((el) => {
            el.classList.add('reveal');
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    // Close modal on ESC
    useEffect(() => {
        if (!isDemoOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setIsDemoOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isDemoOpen]);

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

            <div className="relative w-full h-screen overflow-hidden home-reveal">
                <div className="absolute bg-[#b8def79e] rounded-full 
                w-[130vw] h-[130vw] -left-[45vw] -top-[10vw] 
                md:w-[72vw] md:h-[72vw] md:-left-[20vw] md:-top-[27.5vw] ">
                </div>

                <div className="absolute bg-[#81c5f39e] rounded-full z-0
                w-[80vw] h-[80vw] left-[52vw] -top-[10vw] rotate-[1.14deg] 
                md:w-[83vw] md:h-[83vw] md:left-[23vw] md:-top-[55vw] ">
                </div>

                <p className='text-start text-[#252525] opacity-85 absolute z-10 font-bold mdtext-base/20 
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

                <button
                    type="button"
                    onClick={() => { if (embedUrl) setIsDemoOpen(true); }}
                    aria-label="Watch demo video"
                    title={embedUrl ? "Watch demo" : "Set DEMO_URL to your YouTube link to enable"}
                    className='relative flex items-center justify-center mt-165 mx-auto md:mt-0 md:mx-0 h-13 w-88 bg-[#FFFFFF] border-2 border-solid rounded-[20px] px-4 pl-12 shadow-md border-[#89A8B2] opacity-80 hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                           md:absolute
                           md:-top-[-38vw] md:left-[53.5vw] '
                    disabled={!embedUrl}
                >
                    <svg
                        aria-hidden="true"
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-[#89A8B2]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <circle cx="12" cy="12" r="11" className="opacity-20" />
                        <path d="M10 8l6 4-6 4V8z" />
                    </svg>
                    <span className="text-[#252525] font-medium">Watch demo</span>
                </button>

            </div>

            {/* Demo Modal */}
            {isDemoOpen && (
                <div
                    className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setIsDemoOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Demo video"
                >
                    <div
                        className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsDemoOpen(false)}
                            className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-gray-800 hover:bg-white shadow cursor-pointer"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                        <iframe
                            title="Demo video"
                            src={`${embedUrl}?autoplay=1&rel=0`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}

            <div className='relative bottom-[120px] md:bottom-0 text-center home-reveal'>
                <h1 className=' text-[28px] md:text-[32px] text-[#252525] opacity-85 font-medium mb-4 mx-15 md:mx-0 '>Empowering Filipino
                    Blue-Collar Workers</h1>

                <p className='mx-5 md:mx-60 mb-15 text-[16px] md:text-[18px] text-gray-600'>A platform designed for Filipino bluecollar workers to
                    connect, showcase their skills, and find job opportunities. Engage in real-time chats, network with potential clients, and grow your professional reputation all in one place!</p>

            </div>

            {/* <div className="relative bottom-[120px] md:bottom-0 mx-5 my-5 md:mx-20 md:my-15">
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
            </div> */}

            <div className="relative bottom-[120px] md:bottom-0 mx-5 my-5 md:mx-20 md:my-15 home-reveal">
                <div className="p-6 rounded-xl">
                    <div className="flex flex-col md:flex-row gap-8 items-stretch">
                        {/* Responsive Showcase (overlapping desktop + mobile) with optional img src */}
                        <div className="w-full md:w-2/3">
                            <div className="relative w-full h-48 sm:h-60 md:h-80 lg:h-[28rem] xl:h-[34rem] rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                                {/* Desktop placeholder card */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-[52%] -translate-y-[55%] w-[88%] h-[70%] sm:h-[75%] md:h-[80%] rounded-xl bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-300 shadow-md overflow-hidden">
                                    {desktopSrc ? (
                                        <img src={desktopSrc} alt="Desktop showcase" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="h-6 w-full bg-gray-200/80 border-b border-gray-300 rounded-t-xl"></div>
                                            <div className="p-4 text-gray-500 text-xs sm:text-sm">Desktop placeholder</div>
                                        </>
                                    )}
                                </div>

                                {/* Mobile placeholder card */}
                                <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-8 w-20 h-36 sm:w-24 sm:h-44 md:w-48 md:h-72 lg:w-52 lg:h-98 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-300 shadow-lg overflow-hidden">
                                    {mobileSrc ? (
                                        <img src={mobileSrc} alt="Mobile showcase" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="h-3 w-16 mx-auto mt-2 rounded-full bg-gray-300"></div>
                                            <div className="p-3 text-gray-500 text-[10px] sm:text-xs">Mobile placeholder</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Caption/Text (no UI inputs) */}
                        <div className="w-full md:w-1/3 text-left self-center">
                            <h3 className="text-xl font-semibold mb-2 text-[#252525]">FixIt</h3>
                            <p className="text-gray-600">search by skill and location, chat in real time, send invitations and applications, sign work contracts, and hire with verified profiles and secure workflows all in one place.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative bottom-[120px] md:bottom-0 mx-5 my-5 md:mx-20 md:my-15 home-reveal">
                <div className="bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4 text-left">
                            Skilled Workers<br />for Every Job
                        </h2>
                        <p className="text-left sm:text-lg text-gray-600 mb-8 max-w-3xl">
                            Need a reliable professional? We’ve got you covered! Whether it’s fixing a leak, renovating a
                            space, or handling heavy lifting. Explore a
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