import { useEffect, useRef, useState } from "react";
import discover from '../assets/discovery.png';
import security from '../assets/security.png';
import connect from '../assets/connect.png';
import desktopSrc from '../assets/desktop.png';
import mobileSrc from '../assets/mobile.jpg';

const DEMO_URL = "https://youtu.be/Ca78O9dJT4Q";

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
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [nearBottom, setNearBottom] = useState(false);
    const [footerVisible, setFooterVisible] = useState(false);
    const scrollerRef = useRef(null);
    const topRef = useRef(null);
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

    // Helper: smooth scroll to top for the actual scrolling element (window/body/html)
    const smoothScrollToTop = (duration = 700) => {
        try {
            const target = scrollerRef.current || document.scrollingElement || document.documentElement || document.body;
            const start = (target && typeof target.scrollTop === 'number')
                ? target.scrollTop
                : (window.scrollY || window.pageYOffset || 0);
            if (start <= 0) return; // already at top

            const startTime = performance.now();
            const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

            const step = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / duration, 1);
                const y = Math.max(0, Math.round(start * (1 - easeOutCubic(t))));
                // Write to both in case the app scrolls window or a root element
                if (target && typeof target.scrollTop === 'number') target.scrollTop = y;
                window.scrollTo(0, y);
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        } catch {
            // Fallback: native smooth
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Detect primary scroll container and compute when near bottom
    useEffect(() => {
        const candidates = [
            document.scrollingElement,
            document.documentElement,
            document.body,
            document.getElementById('root'),
            document.getElementById('app'),
            document.querySelector('main'),
            document.querySelector('.App'),
        ].filter(Boolean);

        const isScrollable = (el) => {
            if (!el) return false;
            try {
                const canScroll = (el.scrollHeight - el.clientHeight) > 0;
                if (el === document.body || el === document.documentElement) return canScroll;
                const style = window.getComputedStyle(el);
                const oy = (style.overflowY || '').toLowerCase();
                return canScroll && (oy.includes('auto') || oy.includes('scroll') || oy.includes('overlay'));
            } catch { return false; }
        };

        scrollerRef.current = candidates.find(isScrollable) || document.scrollingElement || document.documentElement || document.body;

        const calcNearBottom = () => {
            const el = scrollerRef.current;
            const stCandidates = [
                window.scrollY,
                window.pageYOffset,
                document.documentElement ? document.documentElement.scrollTop : 0,
                document.body ? document.body.scrollTop : 0,
                el && typeof el.scrollTop === 'number' ? el.scrollTop : 0,
            ].filter((v) => typeof v === 'number');
            const chCandidates = [
                window.innerHeight,
                document.documentElement ? document.documentElement.clientHeight : 0,
                document.body ? document.body.clientHeight : 0,
                el && el.clientHeight ? el.clientHeight : 0,
            ].filter((v) => typeof v === 'number');
            const shCandidates = [
                document.documentElement ? document.documentElement.scrollHeight : 0,
                document.body ? document.body.scrollHeight : 0,
                el && el.scrollHeight ? el.scrollHeight : 0,
            ].filter((v) => typeof v === 'number');

            const scrollTop = Math.max.apply(null, stCandidates);
            const clientHeight = Math.max.apply(null, chCandidates);
            const scrollHeight = Math.max.apply(null, shCandidates);

            // Show only when near the bottom (within 120px), hide otherwise
            const bottomGap = Math.max(0, scrollHeight - (scrollTop + clientHeight));
            const nb = bottomGap <= 120;
            setNearBottom(nb);
        };

        // Attach listeners
        const el = scrollerRef.current;
        window.addEventListener('scroll', calcNearBottom, { passive: true });
        if (el && el !== document.body && el !== document.documentElement) {
            el.addEventListener('scroll', calcNearBottom, { passive: true });
        }
        window.addEventListener('resize', calcNearBottom);
        // Initial compute
        calcNearBottom();

        return () => {
            window.removeEventListener('scroll', calcNearBottom);
            if (el && el !== document.body && el !== document.documentElement) {
                el.removeEventListener('scroll', calcNearBottom);
            }
            window.removeEventListener('resize', calcNearBottom);
        };
    }, []);

    // Observe footer visibility to drive button visibility when footer enters viewport
    useEffect(() => {
        const footerCandidates = [
            document.querySelector('footer'),
            document.getElementById('footer'),
            document.querySelector('.footer'),
            document.querySelector('.site-footer'),
        ].filter(Boolean);
        const target = footerCandidates[0];
        if (!('IntersectionObserver' in window) || !target) {
            setFooterVisible(false);
            return;
        }
        const obs = new IntersectionObserver(
            (entries) => {
                const anyVisible = entries.some((e) => e.isIntersecting);
                setFooterVisible(anyVisible);
            },
            { root: null, threshold: 0.1 }
        );
        obs.observe(target);
        return () => obs.disconnect();
    }, []);

    // Combine signals: show button if near bottom or footer is visible
    useEffect(() => {
        setShowScrollTop(nearBottom || footerVisible);
    }, [nearBottom, footerVisible]);

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
        "Electrical & Plumbing",
        "Cleaning & Housekeeping",
        "Apprentice & Helper work",
    ];

    return (
        <>
            {/* Top sentinel for reliable scrollIntoView */}
            <div ref={topRef} aria-hidden="true" />

            <div className="relative w-full h-auto md:h-screen overflow-x-hidden md:overflow-hidden home-reveal">
                <div className="absolute bg-[#b8def79e] rounded-full 
                w-[130vw] h-[130vw] -left-[45vw] -top-[10vw] 
                md:w-[72vw] md:h-[72vw] md:-left-[20vw] md:-top-[27.5vw] ">
                </div>

                <div className="absolute bg-[#81c5f39e] rounded-full z-0
                w-[80vw] h-[80vw] left-[52vw] -top-[10vw] rotate-[1.14deg] 
                md:w-[83vw] md:h-[83vw] md:left-[23vw] md:-top-[55vw] ">
                </div>

                                <p className='text-start text-[#252525] opacity-85 z-10 font-bold pl-6 text-[38px] w-80 mt-30 md:mt-0
                                    md:absolute md:-top-[-17vw] md:pl-24 md:text-[64px]  md:w-150' >
                    We connect skilled worker to help you
                </p>

                                <p className='text-start text-[#252525] font-light opacity-80 z-10 mt-4 pl-6 w-80 text-[20px]
                                            md:absolute md:-top-[-30vw] md:left-[100vh] md:pl-24 md:w-120'>
                    Find high quality talent or open jobs that keep you in control.
                </p>

                                <p className='text-start text-[#252525] font-light opacity-80 z-10 mt-2 pl-6 w-80 text-[18px]
                                            md:absolute md:-top-[-35vw] md:left-[100vh] md:pl-24 md:w-120'>
                    I'm looking for
                </p>

                <button
                    type="button"
                    onClick={() => { if (embedUrl) setIsDemoOpen(true); }}
                    aria-label="Watch demo video"
                    title={embedUrl ? "Watch demo" : "Set DEMO_URL to your YouTube link to enable"}
                                        className='relative flex items-center justify-center mt-6 mx-auto md:mt-0 md:mx-0 h-[52px] w-[22rem] max-w-[90vw] bg-[#FFFFFF] border-2 border-solid rounded-[20px] px-4 pl-12 shadow-md border-[#89A8B2] opacity-80 hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
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
                    className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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

            <div className='relative mt-10 mb-10 md:my-0 md:bottom-0 text-center home-reveal'>
                <h1 className='text-2xl sm:text-4xl md:text-5xl font-bold text-[#252525] opacity-85 mb-4 mx-15 md:mx-0 '>Empowering Filipino
                    Blue-Collar Workers</h1>

                <p className='mx-5 md:mx-60 mb-15 text-[16px] md:text-[18px] text-gray-600'>A platform designed for Filipino bluecollar workers to
                    connect, showcase their skills, and find job opportunities. Engage in real-time chats, and grow your professional reputation all in one place!</p>

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

            <div className="relative md:bottom-0 mx-5 my-10 md:mx-20 md:my-15 home-reveal">
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

            <div className="relative md:bottom-0 mx-5 my-10 md:mx-20 md:my-15 home-reveal">
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



            {/* Back to top button (fixed bottom-right, shows near bottom or after scrolling) */}
            {showScrollTop && (
            <button
                type="button"
                onClick={() => {
                    try {
                        if (topRef.current && typeof topRef.current.scrollIntoView === 'function') {
                            topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                            smoothScrollToTop(800);
                        }
                    } catch {
                        smoothScrollToTop(800);
                    }
                }}
                aria-label="Back to top"
                title="Back to top"
                className="fixed z-[9999] pointer-events-auto bottom-4 right-4 md:bottom-6 md:right-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#252525] text-white shadow-lg hover:bg-[#111] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 transition active:scale-95"
            >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M12 4l-7 7h4v9h6v-9h4l-7-7z" />
                </svg>
            </button>
            )}

        </>
    );

};

export default HomePage;