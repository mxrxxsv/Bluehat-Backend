import { Link} from "react-router-dom";
import worker from '../assets/worker.png';
import client from '../assets/client.png';

const Signup = () => {

    return (
        <>
            <p className="mt-30 text-center text-neutral-900 font-semibold pt-8 text-[20px] sm:text-[24px] md:text-3xl lg:text-4xl pt-4 opacity-80">
                Join as a Client or Worker
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-14 px-4">

                <Link to="" className="w-80 h-50 p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg">
                    <img className="w-10 h-10 text-gray-500 mx-auto mb-3" src={client} alt="client" />
                    <p className="text-[22px] font-medium text-gray-900">
                        I’m a client, hiring for a project
                    </p>
                </Link>

                <Link to="" className="w-80 h-50 p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg">
                    <img className="w-10 h-10 text-gray-500 mx-auto mb-3" src={worker} alt="worker" />
                    <p className="text-[22px] font-medium text-gray-900">
                        I’m a freelancer, looking for work
                    </p>
                </Link>

            </div>
        </>
    );

}

export default Signup;