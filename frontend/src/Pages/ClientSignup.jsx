import { Link } from "react-router-dom";
import React, { useEffect, useState } from "react";

const ClientSignup = () => {

    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleCreateAccount = (e) => {
        e.preventDefault();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };


    return (
        <>

            <form onSubmit={handleCreateAccount} className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mt-30 p-6 bg-white shadow-md rounded-lg">

                <p className="text-center text-xl md:text-2xl font-medium mb-6 opacity-80">Sign up to find workers</p>

                <div className="grid gap-6 mb-6 md:grid-cols-2">
                    <div>
                        <label htmlFor="first_name" className="block mb-2 text-sm font-medium text-gray-900 text-left">First name</label>
                        <input type="text" id="first_name" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="John"/>
                    </div>
                    <div>
                        <label htmlFor="last_name" className="block mb-2 text-sm font-medium text-gray-900 text-left">Last name</label>
                        <input type="text" id="last_name" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Doe"/>
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 text-left">Email address</label>
                    <input type="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="john.doe@company.com"/>
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 text-left">Password</label>
                    <input type="password" id="password" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="•••••••••"/>
                </div>

                <div className="mb-6">
                    <label htmlFor="confirm_password" className="block mb-2 text-sm font-medium text-gray-900 text-left">Confirm password</label>
                    <input type="password" id="confirm_password" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="•••••••••"/>
                </div>

                <div className="flex items-center mb-6">
                    <input id="remember" type="checkbox" className="w-4 h-4 mb-5 md:mb-0 text-sky-600 bg-gray-100 border-gray-300 rounded focus:ring-sky-500"/>
                    <label htmlFor="remember" className="ml-2 text-sm font-medium text-gray-900">
                        Yes, I understand and agree to the <a href="#" className="text-blue-600 hover:underline"> BlueHat Terms of Service</a>.
                    </label>
                </div>

                <button type="submit" className="w-full px-3 py-2 text-base font-medium text-center text-white bg-[#55b3f3] rounded-lg hover:bg-blue-300 focus:ring-4 focus:ring-blue-300 cursor-pointer">Create Account</button>

            </form>


            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-80">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-11/12 max-w-md text-center">
                        <h2 className="text-xl font-semibold mb-4">Verify Account</h2>
                        <p className="mb-6 text-gray-600">Do you want to verifiy your profile now?</p>
                        <div className="flex justify-center gap-4">
                            <Link to="/bluehat/workerquestion">
                                <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg shadow-sm">
                                    Yes
                                </button>
                            </Link>
                            <Link to="/find-workers" >
                                <button
                                    onClick={closeModal}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg shadow-sm cursor-pointer"
                                >
                                    Later
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default ClientSignup;