const express = require('express')
const router = express.Router();
const connectDB = require('../db')

connectDB().then(db => {

    let collection = db.collection("gradess");
    router.get("/learner/:id/avg-class", async (req, res) => {
      let result = await collection
        .aggregate([
          {
            $match: { student_id: Number(req.params.id) },
          },
          {
            $unwind: { path: "$scores" },
          },
          {
            $group: {
              _id: "$class_id",
              quiz: {
                $push: {
                  $cond: {
                    if: { $eq: ["$scores.type", "quiz"] },
                    then: "$scores.score",
                    else: "$$REMOVE",
                  },
                },
              },
              exam: {
                $push: {
                  $cond: {
                    if: { $eq: ["$scores.type", "exam"] },
                    then: "$scores.score",
                    else: "$$REMOVE",
                  },
                },
              },
              homework: {
                $push: {
                  $cond: {
                    if: { $eq: ["$scores.type", "homework"] },
                    then: "$scores.score",
                    else: "$$REMOVE",
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              class_id: "$_id",
              avg: {
                $sum: [
                  { $multiply: [{ $avg: "$exam" }, 0.5] },
                  { $multiply: [{ $avg: "$quiz" }, 0.3] },
                  { $multiply: [{ $avg: "$homework" }, 0.2] },
                ],
              },
            },
          }
        ])
        .toArray();
    
      if (!result) res.send("Not found").status(404);
      else res.send(result).status(200);
    });
})


module.exports = router;