import { Link } from "react-router-dom";

const ClientSignup = () => {

    return (
        <>

            <form className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mt-30 p-6 bg-white shadow-md rounded-lg">

                <p className="text-center text-xl md:text-2xl font-medium mb-6 opacity-80">Sign up to find workers</p>

                <div className="grid gap-6 mb-6 md:grid-cols-2">
                    <div>
                        <label htmlFor="first_name" className="block mb-2 text-sm font-medium text-gray-900">First name</label>
                        <input type="text" id="first_name" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="John" required />
                    </div>
                    <div>
                        <label htmlFor="last_name" className="block mb-2 text-sm font-medium text-gray-900">Last name</label>
                        <input type="text" id="last_name" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Doe" required />
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900">Email address</label>
                    <input type="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="john.doe@company.com" required />
                </div>

                <div className="mb-6">
                    <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">Password</label>
                    <input type="password" id="password" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="•••••••••" required />
                </div>

                <div className="mb-6">
                    <label htmlFor="confirm_password" className="block mb-2 text-sm font-medium text-gray-900">Confirm password</label>
                    <input type="password" id="confirm_password" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="•••••••••" required />
                </div>

                <div className="flex items-center mb-6">
                    <input id="remember" type="checkbox" className="w-4 h-4 text-sky-600 bg-gray-100 border-gray-300 rounded focus:ring-sky-500" required />
                    <label htmlFor="remember" className="ml-2 text-sm font-medium text-gray-900">
                        Yes, I understand and agree to the <a href="#" className="text-blue-600 hover:underline"> BlueHat Terms of Service</a>.
                    </label>
                </div>

                <Link to="/clientsignup" type="submit" className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center focus:ring-4 focus:outline-none focus:ring-blue-300">
                    Create account
                </Link>

            </form>

        </>
    );
}

export default ClientSignup;