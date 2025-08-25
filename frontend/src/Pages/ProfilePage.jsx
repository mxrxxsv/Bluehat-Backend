import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Briefcase } from 'lucide-react';
import jobPosts from '../Objects/jobPosts';
import { checkAuth } from '../api/auth';

const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return 'Unknown';

  const parts = [
    address.barangay,
    address.city,
    address.province,
    
    
       // Instead of 'province'
  ].filter(Boolean); // Removes empty or undefined fields

  return parts.length ? parts.join(', ') : 'Unknown';
};

const ProfilePage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth()
      .then(res => {
        setCurrentUser(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="text-center mt-40 text-gray-500">Loading user profile...</p>;
  }

  if (!currentUser) {
    return <p className="text-center mt-40 text-red-500">User not authenticated.</p>;
  }

  const { userType, fullName, image, address } = currentUser;

  const userPosts =
    userType === 'client'
      ? jobPosts.filter((post) => post.clientId === currentUser.id)
      : currentUser.portfolio || [];

  return (
    <div className="max-w-6xl mx-auto p-6 mt-[100px]">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-white shadow rounded-[20px] p-6 mb-10">
        <img
          src={image || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover"
        />
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-800">{fullName}</h2>
          <p className="text-sm text-gray-500 flex items-center justify-center md:justify-start gap-1">
            <MapPin size={16} /> {formatAddress(address)}
          </p>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 mt-2 inline-block">
            {userType === 'client' ? 'Client' : 'Freelancer'}
          </span>
        </div>
      </div>

      {/* Content Based on Role */}
      {userType === 'client' ? (
        <>
          <h3 className="text-xl font-semibold mb-4 text-gray-700 text-center">Your Job Posts</h3>
          {userPosts.length > 0 ? (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div key={post.id} className="p-4 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                      <Briefcase size={18} className="text-blue-400" /> {post.title}
                    </h4>
                    <span className="text-sm text-green-500 font-bold">
                      ₱{post.priceOffer.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{post.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {post.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {post.datePosted}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">You have not posted any jobs yet.</p>
          )}
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Your Portfolio</h3>
          {userPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((item, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-4">
                  <h4 className="text-md font-bold text-gray-800">{item.projectTitle || 'Untitled Project'}</h4>
                  <p className="text-gray-600 mt-1">{item.description || 'No description provided.'}</p>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.projectTitle}
                      className="mt-3 w-full h-40 object-cover rounded-md"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">You have not added any portfolio projects yet.</p>
          )}
        </>
      )}
    </div>
  );
};

export default ProfilePage;
