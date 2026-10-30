// for this propagation the job of the propagation is the create the search space for my user's so basically what cells in what ring am i trying to find 

import * as  h3_lib from "h3-js";

function cellsAtCurrentRing(startingCell, current_Ring){

    // ring should not be manually encoded 

    if (current_Ring == 0){

        // let us return an array as the number of ceels as every ring will have this format
        // we just want thereturn statement to be the same as all types of return statement

        return [startingCell];

    }

    else{
        // we use the grid Ring function from the h3 library to get all all cells in that specific ring and we store them in an array

    

        // now we retun all the cells in that  ring

        // this retunrn the array

        return h3_lib.gridRing(startingCell, current_Ring);


    }
        

    

};


export {
    cellsAtCurrentRing

};










