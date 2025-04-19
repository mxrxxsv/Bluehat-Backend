import { useParams } from "react-router-dom";
import workers from "../Objects/workers";
import profile from '../assets/worker.png';

const WorkerPortfolio = () => {
  const { id } = useParams();
  const worker = workers.find((w) => w.id.toString() === id);

  if (!worker) return <p>Worker not found.</p>;

  const renderStars = (rating) => {
    return "⭐️".repeat(rating) + "☆".repeat(5 - rating);
  };

  const averageRating =
    worker.reviews.length > 0
      ? (
          worker.reviews.reduce((sum, r) => sum + r.rating, 0) /
          worker.reviews.length
        ).toFixed(1)
      : "No ratings";

  return (
    <div className="p-6 bg-[#f4f6f6] rounded-xl shadow-md space-y-6 w-full lg:w-[90%] my-4 mx-auto mt-30">
      {/* Top Section: Profile Picture and Basic Info */}
      <div className="flex items-start gap-6">
        <img
          // src={worker.profileImage || "/default-profile.png"}
          src={profile}
          alt={worker.name}
          className="w-32 h-32 object-cover rounded-full border"
        />
        <div className="flex-1 space-y-1 text-left">
          <h1 className="text-3xl font-bold">{worker.name}</h1>
          <p className="text-gray-700">{worker.description}</p>
          <p className="text-sm text-gray-500">{worker.location}</p>
          <p className="text-sm text-gray-500">
            Age: {worker.age} •  Gender: {worker.gender}
          </p>

          <div className="mt-3 flex gap-2">
            <button className="p-2 bg-blue-500 text-white shadow-md rounded-[14px] hover:bg-blue-600 hover:shadow-lg cursor-pointer">
              Message
            </button>
            <button className="px-4 py-2 bg-gray-200 text-gray-700 shadow-md rounded-[14px] hover:bg-gray-300 hover:shadow-lg cursor-pointer">
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-left">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {worker.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-[#55b3f3] shadow-sm text-[#f4f6f6] text-[14px] rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Work Experience Section */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-left">
          Work Experience
        </h2>
        <div className="space-y-4">
          {worker.experience.map((exp, index) => (
            <div key={index} className="shadow p-4 my-2 rounded-md text-left bg-white shadow-sm">
              <h3 className="font-semibold text-lg">{exp.company}</h3>
              <p className="text-sm text-gray-500">
                {exp.years} • {exp.position}
              </p>
              <p className="mt-1 text-gray-700">{exp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-left">Ratings & Reviews</h2>
          <span className="text-yellow-500 font-semibold text-sm">
            ⭐ {averageRating} / 5
          </span>
        </div>

        <div className="space-y-2">
          {worker.reviews.map((review, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-md text-left bg-white shadow-sm"
            >
              <img
                // src={review.clientImage || "/default-client.png"}
                src={profile}
                alt={review.clientName}
                className="w-12 h-12 rounded-full object-cover border"
              />
              <div>
                <p className="font-semibold">{review.clientName}</p>
                <p className="text-sm text-gray-500">Skill: {review.skill}</p>
                <p className="text-sm text-yellow-500">
                  {renderStars(review.rating)}
                </p>
                <p className="mt-1 text-gray-700">{review.comment}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkerPortfolio;
