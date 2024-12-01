const express = require('express')
const router = express.Router();
const connectDB = require('../db')

connectDB().then(db => {
    let collection = db.collection("grades");
    const validationRules = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['student_id', 'class_id'],
        properties: {
          student_id: {
            bsonType: 'int',
            description: 'must be integer and is required'
          },
          class_id: {
            bsonType: 'int',
            minimum: 0, 
            maximum:300,
            description: 'must be an integer and is required'
          }
        }
      }
    };
    collection.createIndex({ class_id: 1 })
    collection.createIndex({ student_id: 1 })
    collection.createIndex({ student_id:1, class_id: 1 }) // compound index
    

    //The number of learners with a weighted average 
    //(as calculated by the existing routes) higher than 70%.
    router.get('/stats',async(req,res) =>{
       const totalLearner = await collection.aggregate([
         {
          $group:{
            _id:"$student_id",
            count:{
              $sum:1
            }
          }
         },
         {
          $group:{
            _id:"null",
            count:{
              $sum:1
            }  
          }
         } 
       ]).toArray();
       const learnersAvgHigher70 = await collection.aggregate([
          {
            $unwind:{
              path:"$scores",
            },  
          },
          {
            $group:{
              _id:{"student_id":"$student_id","class_id":"$class_id"},
              quiz: {
                          $push: {
                          $cond: {
                              if: { $eq: ["$scores.type", "quiz"] },
                              then: "$scores.score",
                              else: "$$REMOVE",
                          },
                          },
                      } ,
              exam :{
                  $push :{
                  $cond:{
                      if:{$eq:["$scores.type","exam"]},
                      then:"$scores.score",
                      else:"$$REMOVE",
                  }
                  }
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
              }
             },
             {
               $project: {
                 _id: 0,
                 student_id: "$_id.student_id",
                 class_id: "$_id.class_id",
                 avg: {
                   $sum: [
                     { $multiply: [{ $avg: "$exam" }, 0.5] },
                     { $multiply: [{ $avg: "$quiz" }, 0.3] },
                     { $multiply: [{ $avg: "$homework" }, 0.2] },
                   ],
                 },
               },
             }, {$sort:{student_id:1}},   
             {
              $match:{
                avg:{$gt:70}
              }
             },
             {
              $group:{
                _id:"$student_id"
              }
             },{
              $group:{
                _id:"null",
                count:{
                  $sum:1
                }
              }
             }
       ]).toArray()
       let stats ={
         total_Leaners:totalLearner[0].count,
         total_learners_avg_70 : learnersAvgHigher70[0].count,
         percentage_learners_avg_70 : learnersAvgHigher70[0].count / totalLearner[0].count * 100 
       }
       
       res.json(stats)
    })


    //mimic the above aggregation pipeline, but only for learners within a class
    router.get('/stats/:id',async(req,res)=>{
      const class_id = Number(req.params.id)
      const totalLearnerPerClass = await collection.aggregate([
        {
          $match:{
            "class_id":class_id
          }
        },
        {
         $group:{
           _id:"$student_id",
           count:{
             $sum:1
           }
         }
        },
        {
         $group:{
           _id:"null",
           count:{
             $sum:1
           }  
         }
        } 
      ]).toArray();

      const learnersAvgHigher70 = await collection.aggregate([
            {
              $match:{
                class_id:class_id
              }
            },{
              $unwind:{
                path:"$scores"
              }
            },{
              $group:{
                _id:"$student_id",
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
              }
            },
            {
              $project: {
                _id: 0,
                student_id: "$_id",
                avg: {
                  $sum: [
                    { $multiply: [{ $avg: "$exam" }, 0.5] },
                    { $multiply: [{ $avg: "$quiz" }, 0.3] },
                    { $multiply: [{ $avg: "$homework" }, 0.2] },
                  ],
                },
              },
            },{
              $sort:{student_id:1}
            },{
              $match: {
                avg:{$gt:70}
              }
            },
            {
              $group:{
                _id:"Total",
                count:{
                  $sum:1
                }
              }
            }
      ]).toArray()
      if( totalLearnerPerClass.length == 0 || learnersAvgHigher70.length ==0) return res.json({error:"can't find class"})
      const stats = {
        totalLearnerPerClass : totalLearnerPerClass[0].count,
        learnersAvgHigher70 : learnersAvgHigher70[0].count,
        percentage : learnersAvgHigher70[0].count/totalLearnerPerClass[0].count *100
      }   
      res.json(stats)
    })


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