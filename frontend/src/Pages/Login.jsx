// import {link} from "react-router-dom";
import cute from "../assets/logi.png"
import { Link } from "react-router-dom";

const Login = () => {

    return (
        <>
            <div className="mt-35 mx-full md:bg-white h-130 w-full">


                <div className="md:grid md:grid-cols-[750px_750px] h-80 md:w-full gap-2">
                    <div className="mx-20 mt-5 hidden md:block">
                        <img src={cute} className="h-125 w-125" alt="" />
                    </div>


                    <div className="ml-7 md:mx-20 md:mt-10 md:ml-65">
                        <div className="w-90 lg:max-w-xl p-6 space-y-8 sm:p-8 bg-white rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold text-gray-900">
                                Login to <span className="text-[#55b3f3]">FixIT</span> 
                            </h2>
                            <form className="mt-8 space-y-6" action="#">
                                <div>
                                    <label for="email" className="block mb-2 text-sm font-medium text-left text-gray-900">Email</label>
                                    <input type="email" name="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm" placeholder="name@gmail.com"/>
                                </div>
                                <div>
                                    <label for="password" className="block mb-2 text-sm font-medium text-left text-gray-900">Password</label>
                                    <input type="password" name="password" id="password" placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm"/>
                                </div>
                                <div className="flex items-start">
                                    {/* <div class="flex items-center h-5">
                                        <input id="remember" aria-describedby="remember" name="remember" type="checkbox" class="w-4 h-4 border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600  cursor-pointer" required />
                                    </div> */}
                                    {/* <div class="ms-3 text-sm">
                                        <label for="remember" class="font-medium text-gray-500 dark:text-gray-400">Remember me</label>
                                    </div> */}
                                    <Link to="/forgetpass" className="ms-auto text-sm font-medium text-[#55b3f3] hover:underline">Lost Password?</Link>
                                </div>
                                <button type="submit" className="w-full px-3 py-2 text-base font-medium text-center text-white bg-[#55b3f3] rounded-lg hover:bg-blue-300 focus:ring-4 focus:ring-blue-300 cursor-pointer">Login</button>
                                <div className="text-sm font-medium text-gray-900">
                                    Not registered yet? <Link to="/signup" className="text-[#55b3f3] hover:underline">Create account</Link>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>

            </div>
        </>
    );

}

export default Login;