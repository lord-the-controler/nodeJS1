const DB_NAME = "practice-db";
const limit = "35kb";
const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
};

// Exports
export {DB_NAME,limit,options}