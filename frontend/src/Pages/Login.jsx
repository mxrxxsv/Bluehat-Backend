// import {link} from "react-router-dom";
import cute from "../assets/logi.png"

const Login = () => {

    return (
        <>
            <div className="mt-35 mx-full bg-white h-130 w-full">


                <div className="grid grid-cols-[750px_750px] h-80 w-full gap-2">
                    <div className="mx-20 mt-10">
                        <img src={cute} className="h-125 w-125" alt="" />
                    </div>


                    <div className="mx-20 mt-10 md:ml-65">
                        <div class="w-90 lg:max-w-xl p-6 space-y-8 sm:p-8 bg-white rounded-lg shadow-md">
                            <h2 class="text-2xl font-bold text-gray-900 ">
                                Login to FixIT
                            </h2>
                            <form class="mt-8 space-y-6" action="#">
                                <div>
                                    <label for="email" class="block mb-2 text-sm font-medium text-left text-gray-900">Email</label>
                                    <input type="email" name="email" id="email" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" placeholder="name@gmail.com" required />
                                </div>
                                <div>
                                    <label for="password" class="block mb-2 text-sm font-medium text-left text-gray-900">Password</label>
                                    <input type="password" name="password" id="password" placeholder="••••••••" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" required />
                                </div>
                                <div class="flex items-start">
                                    <div class="flex items-center h-5">
                                        <input id="remember" aria-describedby="remember" name="remember" type="checkbox" class="w-4 h-4 border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600  cursor-pointer" required />
                                    </div>
                                    <div class="ms-3 text-sm">
                                        <label for="remember" class="font-medium text-gray-500 dark:text-gray-400">Remember this device</label>
                                    </div>
                                    <a href="#" class="ms-auto text-sm font-medium text-blue-600 hover:underline dark:text-blue-500">Lost Password?</a>
                                </div>
                                <button type="submit" class="w-full px-3 py-2 text-base font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 sm:w-auto cursor-pointer">Login</button>
                                <div class="text-sm font-medium text-gray-900">
                                    Not registered yet? <a class="text-blue-600 hover:underline dark:text-blue-500">Create account</a>
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