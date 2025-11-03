import { useLocation } from "react-router-dom";

const Footer = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    if (currentPath !== "/" && currentPath !== "/home") return null;

    return (
        <footer className="bg-gradient-to-r from-[#f4f6f6] to-[#cfe8f7] text-gray-800 px-4 py-5">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-20">
                {/* Contact Form */}
                <div>
                    <h3 className="text-[24px] font-bold mb-2 text-left">
                        Always remember that we are here for you
                    </h3>
                    <p className="text-sm mb-4 text-left">
                        If you have concern and suggestion, please send your message by
                        filling the form below.
                    </p>
                    <input
                        type="email"
                        placeholder="Your email"
                        className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-[10px] bg-white"
                    />
                    <textarea
                        placeholder="Your message here..."
                        className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-[10px] bg-white h-24 resize-none"
                    ></textarea>
                    <div className="flex md:justify-end">
                        <button className="w-full sm:w-auto bg-gray-800 text-white px-6 py-2 rounded-[12px] hover:bg-gray-700 transition">
                            Submit
                        </button>
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 className="font-semibold mb-2 text-[20px] text-left">Quick Links</h4>
                    <ul className="space-y-2 text-[16px] text-left">
                        <li className="hover:underline cursor-pointer">Home</li>
                        <li className="hover:underline cursor-pointer">Browse Workers</li>
                        <li className="hover:underline cursor-pointer">Become a Worker</li>
                        <li className="hover:underline cursor-pointer">Contact Us</li>
                        <li className="hover:underline cursor-pointer">FAQ</li>
                    </ul>
                </div>

                {/* About & Legal */}
                <div>
                    <h4 className="font-semibold mb-2 text-[20px] text-left">About & Legal</h4>
                    <ul className="space-y-2 text-[16px] text-left">
                        <li className="hover:underline cursor-pointer">About Us</li>
                        <li className="hover:underline cursor-pointer">Terms & Conditions</li>
                        <li className="hover:underline cursor-pointer">Privacy Policy</li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div>
                    <h4 className="font-semibold mb-2 text-[20px] text-left ">Contact & Support</h4>
                    <div className="text-left">
                        <p className="text-[16px] mb-2">
                            <span className="font-semibold">Location:</span> Sumacab Este, Cabanatuan City, Nueva Ecija
                        </p>
                        <p className="text-[16px] mb-2">
                            <span className="font-semibold">Email:</span> fixit.app.ph@gmail.com
                        </p>
                        <p className="text-[16px]">
                            <span className="font-semibold">Phone:</span> +123 456 7890
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center text-sm mt-10 border-t border-[#252525] pt-4 font-bold text-gray-700">
                © {new Date().getFullYear()} FixIt. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
