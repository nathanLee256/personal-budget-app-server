var express = require('express');
var router = express.Router();

/* This file contains all server routes which handle requests from the Worksheet.js page in the client */

//START ROUTE 1

    /* route for handling HTTP POST requests from the Save Data Button in the Worksheet component */
    router.post('/save_items', async (req, res) => {
    
        function processBudgetItems(dataObj) {
            //first define mapping objects

            const secondaryCategoryMapping = {
                //Income
                "Standard": "Standard",
                "Benefit" : "Benefit",
                "Other": "Other Income",

                //Expenditure
                "Home": "Home",
                "LivingCosts": "Living Costs",
                "Travel": "Travel",
                "FamilyPets": "Family Pets",
                "Leisure": "Leisure",
                "FutureNeeds": "Future Needs",
                "Giving": "Giving",
                "DebtRepayments": "Debt Repayments"
            };

            const tertiaryCategoryMapping = {
                //secondary cats in comments
                //Standard
                "StandardIncome": "Standard Income",

                //Benefit
                "BenefitIncome": "Benefit Income",

                //Other
                "OtherIncome": "Other Income",

                //Home
                "RentMortgage": "Rent Mortgage",
                "Bills": "Bills",

                //LivingCosts
                "General": "General Living Costs",
                "Health": "Health",
                "Other": "Other Living", 

                //Travel
                "Vehicle": "Vehicle",
                "PublicTransport": "Public Transport",
                "Other": "Other Travel",

                //FamilyPets
                "SchoolCosts": "School Costs",
                "PetCosts": "Pet Costs",
                "Other": "Other FamilyPets",
                
                //Leisure
                "Subscriptions": "Subscriptions",
                "Memberships": "Memberships",
                "Other": "Other Leisure",
                
                //FutureNeeds
                "Savings": "Savings",
                "Investments": "Investment", 
                
                //Giving
                "Giving": "Giving",

                //DebtRepayments
                "Debts": "Debts"
            };

            const userId = dataObj.UserId; // Extract user_id directly

            if (!userId) {
                throw new Error("Missing user_id in request body");
            }

            let databaseObjects = []; // Array to store database rows

            // Iterate over primary categories. These are the level 1 object properties: UserId (int), Income (object), Expenditure(object)
            for (const primaryCategory in dataObj) {
                if (primaryCategory === "UserId") continue; // Skip user_id key

                const categories = dataObj[primaryCategory]; // categories is an object containing the level-2 properties only

                for (const secondaryCategory in categories) {
                    const formattedSecondaryCategory = secondaryCategoryMapping[secondaryCategory]; // apply mapping to secondary categories
                    const tertiaryCategories = categories[secondaryCategory]; // tertiaryCategories is an object containing the level-3 properties only

                    for (const tertiaryCategory in tertiaryCategories) {
                        const formattedTertiaryCategory = tertiaryCategoryMapping[tertiaryCategory] || "Other Leisure";  // apply the mapping to tertiary categories
                        const itemsArray = tertiaryCategories[tertiaryCategory]; // itemsArray is an array of objects stored in a level-3 object

                        if (Array.isArray(itemsArray) && itemsArray.length > 0) {
                            const newRows = itemsArray.map(obj => ({ 
                                user_id: userId, 
                                primary_category: primaryCategory, 
                                secondary_category: formattedSecondaryCategory,
                                tertiary_category: formattedTertiaryCategory,  // Correct ENUM value
                                item_name: obj.item,
                                current_amount: obj.amount,
                                frequency: obj.frequency,
                            })); // newRows is an array of data objects to be added to the table

                            databaseObjects.push(...newRows);
                        }
                    }
                }
            }

            return databaseObjects;
        }

        // Step 1: Access the JSON object from the request body
        const data = req.body;

        // Step 2: Define a try-catch block
        try {
            const newData = processBudgetItems(data);

            if (newData.length === 0) {
                return res.status(400).json({ error: "No valid budget items found in request body" });
            }

            const userId = newData[0].user_id; // Extract user_id from newData

            // **Step 1: Delete existing rows for the user**
            await req.db('current_budget_items').where({ user_id: userId }).del();

            // **Step 2: Insert new data**
            await req.db('current_budget_items').insert(newData);

            res.json({
                message: "Existing records deleted, new data inserted successfully",
                insertedRows: newData.length
            });

        } catch (error) {
            console.error(`Server error: ${error.message}`);
            res.status(500).json({ error: error.message });
        }
    });

//END ROUTE 1

//START ROUTE 2
    /* server route for handling HTTP GET request from the Worksheet useEffect (to check if user has budget items in database) */
    router.get("/retrieve_items", (req, res) => {
        const userId = req.query.UserId; // ✅ Get userId from URL parameters

        //define a function to assign data from server to each level-3 property is the response object payload
        function preparePayload(objArray){
            //iterate over the array of objects

            let payloadObj = {
                IsUserData: true,
                Income: {
                    Standard:{
                        StandardIncome: []
                    },
                    Benefit:{
                        BenefitIncome:[]
                    },
                    Other:{
                        OtherIncome:[]
                    }
                },

                Expenditure: {
                    Home:{
                        RentMortgage: [],
                        Bills: []
                    },
                    LivingCosts:{
                        General:[],
                        Health:[],
                        OtherLivingCosts:[]
                    },
                    Travel:{
                        Vehicle:[],
                        PublicTransport: [],
                        OtherTravel:[]
                    },
                    FamilyPets:{
                        SchoolCosts:[],
                        PetCosts:[],
                        OtherFamilyPets:[]
                    },
                    Leisure:{
                        Subscriptions:[],
                        Memberships:[],
                        OtherLeisure:[]
                    },
                    FutureNeeds:{
                        Savings:[],
                        Investment:[]
                    },
                    Giving:{
                        Giving:[]
                    },
                    DebtRepayments:{
                        Debts:[]
                    }
                }
            };
        
            // the objArray is an array of data objects in the form:
            /*{
                "primary_category": "Income",
                "secondary_category": "Standard",
                "tertiary_category": "Standard Income",
                "item_name": "Salary",
                "current_amount": "365.00",
                "frequency": "annually",
                "current_four_weekly_amount": "28.08"
            } 
            */
            if(objArray.length === 0){
                //if true it means the database query revealed that user has no budget items
                //in which case we return the (empty) payloadObj from line 418
                return payloadObj;
            } else{
                //else the query returned some budgeit items
                //in which case we construct the paload object by mapping over objArray
                objArray.forEach((obj) => {
                    switch(obj.tertiary_category){
                        //Income > Standard
                        case "Standard Income": //
                            payloadObj.Income.Standard.StandardIncome.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
                        
                        //Income > Benefit
                        case "Benefit Income": //
                            payloadObj.Income.Benefit.BenefitIncome.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
                    
                        //Income > Other
                        case "Other Income": //
                            payloadObj.Income.Other.OtherIncome.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure> Home
                        case "Rent Mortgage": //
                            payloadObj.Expenditure.Home.RentMortgage.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Bills": //
                            payloadObj.Expenditure.Home.Bills.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure> Living Costs
                        case "General Living Costs": //
                            payloadObj.Expenditure.LivingCosts.General.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Health": //
                            payloadObj.Expenditure.LivingCosts.Health.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Other Living": //
                            payloadObj.Expenditure.LivingCosts.OtherLivingCosts.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure> Travel
                        case "Vehicle": //
                                payloadObj.Expenditure.Travel.Vehicle.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Public Transport": //
                            payloadObj.Expenditure.Travel.PublicTransport.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Other Travel": //
                            payloadObj.Expenditure.Travel.OtherTravel.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure> Family Pets
                        case "School Costs": //
                            payloadObj.Expenditure.FamilyPets.SchoolCosts.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Pet Costs": //
                            payloadObj.Expenditure.FamilyPets.PetCosts.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Other FamilyPets": //
                            payloadObj.Expenditure.FamilyPets.OtherFamilyPets.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure> Leisure
                        case "Subscriptions": //
                            payloadObj.Expenditure.Leisure.Subscriptions.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Memberships": //
                            payloadObj.Expenditure.Leisure.Memberships.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Other Leisure": //
                            payloadObj.Expenditure.Leisure.OtherLeisure.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        //Expenditure > Future Needs
                        case "Savings": //
                            payloadObj.Expenditure.FutureNeeds.Savings.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        case "Investment": //
                            payloadObj.Expenditure.FutureNeeds.Investment.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure > Giving
                        case "Giving": //
                            payloadObj.Expenditure.Giving.Giving.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount),
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount)
                            });
                            break;
            
                        // Expenditure > Debts
                        case "Debts": //
                            payloadObj.Expenditure.DebtRepayments.Debts.push({
                                item: obj.item_name, 
                                amount: parseFloat(obj.current_amount), 
                                frequency: obj.frequency, 
                                total: parseFloat(obj.current_four_weekly_amount) // ✅ Ensure "total" is a number
                            });
                            break;
                        
                        // ✅ Default case to handle unexpected categories
                        default:
                            console.warn(`⚠️ Unrecognized tertiary_category: "${obj.tertiary_category}"`); // ✅ Debugging log
                            break;
                    }
                })
                return payloadObj; // ✅ Return the constructed object

            }
        }

        if (!userId) {
            return res.status(400).json({ error: "UserId is required" });
        }

        req.db
            .from("current_budget_items")
            .select("primary_category","secondary_category", "tertiary_category", "item_name", "current_amount", "frequency", "current_four_weekly_amount") // ✅ Select only 4 columns
            .where("user_id", userId)
            .then((items) => {
                const payload = preparePayload(items);
                return res.json(payload);
                
            })
            .catch((error) => {
                console.error("❌ Database error:", error.message, "\n", error.stack);
                res.status(500).json({ error: "Internal server error", details: error.message });
            });
    });

//END ROUTE 2

// Export the router for use in other parts of the application
module.exports = router;