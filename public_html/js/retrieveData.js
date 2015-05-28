/* 
 *Ali Shirazi
 *Emma Code Challenge
 *05-07-15
 */
 

//Global variables
var odInstanceTypePriceSpread=[];
var odRegionPriceSpread = [];
var odRegionsList =[];
var regionAverages =[];
var odCurrency;
var spotCurrency;
var odRate;
var spotRate;
var topTenPricePerVcpuInstances= [];

var spotInstanceTypePriceSpread=[];
var spotRegionPriceSpread=[];
var spotRegionsList =[];
var sortByPricePerVcpu= function(instance1, instance2){
        return instance1.pricePerVcpu - instance2.pricePerVcpu;  
    };


//Call asynchronous remote server request for Amazon OnDemand Instance Data.
//Parsing of instances for project requirements is called after successful retrieval
$.ajax({
    url: "http://a0.awsstatic.com/pricing/1/ec2/linux-od.min.js",
    dataType: "jsonp",
    jsonpCallback: "callback",
    success: parseAmazonODInstances
   //Due to remote server request, custom error callback and global events will not be called.
});


//Parsing of Amazon OnDemand Instance Data for project requirements. The function will use
//nested loops to scan through every instance based on the structure of the 
//returned Amazon Instance Data. region->instanceType->size

//It will then call an asynchronous remote server request for Amazon Spot Instance Data.
function parseAmazonODInstances(data) {
    
    var config= $(data).prop("config");

    odCurrency = $(config).prop("currencies")[0];
    odRate = $(config).prop("rate");
    odRegionsList = $(config).prop("regions");
    
    var processODRegions = function(regions){  
          for(var regionCounter = 0; regionCounter<regions.length; regionCounter++)
           {
               var regionMin = parseFloat(regions[regionCounter].instanceTypes[0].sizes[0].valueColumns[0].prices.USD);
               var regionMax= regionMin;
               var regionName = regions[regionCounter].region;
               var regionPriceTotal = 0;
               var regionNumberOfSizes = 0;
               
               for(var instanceTypesCounter=0; instanceTypesCounter<regions[regionCounter].instanceTypes.length; instanceTypesCounter++)
               {
                   var sizeVcpus= 0;
                   var sizePrice = 0;
                   var instanceType = regions[regionCounter].instanceTypes[instanceTypesCounter].type;
                   var instanceMin = parseFloat(regions[regionCounter].instanceTypes[instanceTypesCounter].sizes[0].valueColumns[0].prices.USD);
                   var instanceMax= instanceMin;
                   
                   for(var sizesCounter=0; sizesCounter<regions[regionCounter].instanceTypes[instanceTypesCounter].sizes.length; sizesCounter++)
                   {
                        var sizePrice = parseFloat(regions[regionCounter].instanceTypes[instanceTypesCounter].sizes[sizesCounter].valueColumns[0].prices.USD);
                        var sizeVcpus = parseInt(regions[regionCounter].instanceTypes[instanceTypesCounter].sizes[sizesCounter].vCPU); 
                        regionPriceTotal += sizePrice;
                        regionNumberOfSizes++;
                        if(sizePrice< instanceMin){
                            instanceMin = sizePrice;
                        }
                        else if(sizePrice> instanceMax){
                            instanceMax = sizePrice;
                        }
                        addToPricePerVcpuInstances(instanceType, regionName, sizeVcpus, sizePrice, sizePrice/sizeVcpus);               
                   }
                   if(instanceMin < regionMin)
                   {
                       regionMin = instanceMin;
                   }
                   if(instanceMax > regionMax)
                   {
                       regionMax = instanceMax;
                   }
                   addToODInstanceTypePriceSpread(instanceType, instanceMin, instanceMax);
               }
               
               odRegionPriceSpread.push({name:regionName, min:regionMin, max:regionMax});
               regionAverages.push({name:regionName, regionAverage:(regionPriceTotal/regionNumberOfSizes)});
             
           }

     };
    //Call inner function expression to begin parsing.
     processODRegions(odRegionsList);
     
    //Call asynchronous remote server request for Amazon Spot Instance Data.
    //Parsing of instances for project requirements is called after successful retrieval
    $.ajax({
    url: "http://spot-price.s3.amazonaws.com/spot.js",
    dataType: "jsonp",
    jsonpCallback: "callback",
    success: parseAmazonSpotInstances
   //Due to remote server request, custom error callback and global events will not be called.
    });
 }
 
//Parsing of Amazon Spot Instance Data for project requirements. The function will use
//nested loops to scan through every instance based on the structure of the 
//returned Amazon Instance Data. region->instanceType->size->valueColumns

//It will then call the displayData() function to display the project requirements.
 function parseAmazonSpotInstances(data) {
    
    var config= $(data).prop("config");

    spotCurrency = $(config).prop("currencies")[0];
    spotRate = $(config).prop("rate");
    spotRegionsList = $(config).prop("regions");
    
    var processSpotRegions = function(regions){  
          for(var regionCounter = 0; regionCounter<regions.length; regionCounter++)
           {
               var regionMin = 10000000000;
               var regionMax = 0;
               var regionName = regions[regionCounter].region;;
               var regionPriceTotal = 0;
               var regionNumberOfSizes = 0;
               
               for(var instanceTypesCounter=0; instanceTypesCounter<regions[regionCounter].instanceTypes.length; instanceTypesCounter++)
               {
                   var instanceType = regions[regionCounter].instanceTypes[instanceTypesCounter].type;
                   var instanceMin = 10000000000;
                   var instanceMax= 0;
                   for(var sizesCounter=0; sizesCounter<regions[regionCounter].instanceTypes[instanceTypesCounter].sizes.length; sizesCounter++)
                   {
                       for(var valuesCounter=0; valuesCounter<regions[regionCounter].instanceTypes[instanceTypesCounter].sizes[sizesCounter].valueColumns.length; valuesCounter++)
                       {
                        var sizePrice = regions[regionCounter].instanceTypes[instanceTypesCounter].sizes[sizesCounter].valueColumns[valuesCounter].prices.USD;
                        if(sizePrice !== "N/A*"){
                            sizePrice = parseFloat(sizePrice);
                            regionPriceTotal += sizePrice;
                            regionNumberOfSizes++;
                            if(sizePrice< instanceMin){
                                instanceMin = sizePrice;
                            }
                            else if(sizePrice> instanceMax){
                                instanceMax = sizePrice;
                            }
                        }
                       }
                      
                   }
                   if(instanceMin !== 10000000000)
                   {
                       if(instanceMax === 0)
                       {
                           instanceMax = instanceMin;
                       }
                    if(instanceMin < regionMin)
                    {
                        regionMin = instanceMin;
                    }
                    if (instanceMax > regionMax)
                    {
                        regionMax = instanceMax;
                    }
                     addToSpotInstanceTypePriceSpread(instanceType, instanceMin, instanceMax);
                   }
               }
               
               spotRegionPriceSpread.push({name:regionName, min:regionMin, max:regionMax});
               addToRegionAverage(regionName, (regionPriceTotal/regionNumberOfSizes));
           }

     };
     
     //Call inner function expression to begin parsing
     processSpotRegions(spotRegionsList);
     
     //Display project requirements calculated.
     displayData();
 }
 
//Function used to determine the average to run an instance for every region(OnDemand and Spot combined).

//If the region is found,such as the same region in Spot is found in OnDemand, the average is calculated off 
//both values.
 
 ////If region is not found, it is added to the array of region averages. 
 function addToRegionAverage(name, regionAverage){
     var regionFound = false;
     for(var regionCounter=0; regionCounter<regionAverages.length; regionCounter++)
     {
         if(name === regionAverages[regionCounter].name)
         {
             regionFound = true;
             regionAverages[regionCounter].regionAverage = (regionAverages[regionCounter].regionAverage + regionAverage)/2;
         }
         
     }
     if(regionFound === false)
     {
         regionAverages.push({name:name, regionAverage:regionAverage});
     }
 } 
 
//Function used to determine the price spread(min, max) for an Amazon OnDemand instance type ).

//If the instance type is found(instance types are not exclusive to each region), the instance type data
//passed is analyzed to determine if there is a new min/max.
 
 ////If instance type is not found, it is added to the array of instance type price spreads. 
function addToODInstanceTypePriceSpread(name, min, max){
    var instanceTypeFound = false;
    for(var instanceCounter=0; instanceCounter < odInstanceTypePriceSpread.length; instanceCounter++)
    {
        
        if(name === odInstanceTypePriceSpread[instanceCounter].name)
        {
            instanceTypeFound = true;
            if(min < odInstanceTypePriceSpread[instanceCounter].min)
            {
                odInstanceTypePriceSpread[instanceCounter].min = min;
            }
            if(max > odInstanceTypePriceSpread[instanceCounter].max)
            {
                odInstanceTypePriceSpread[instanceCounter].max = max;
            }
        }
    }
    if(instanceTypeFound === false)
    {
        odInstanceTypePriceSpread.push({name: name, min:min, max: max});
    }
}

//Function used to determine the price spread(min, max) for a Spot OnDemand instance type ).

//If the instance type is found(instance types are not exclusive to each region), the instance type data
//passed is analyzed to determine if there is a new min/max.
 
 ////If instance type is not found, it is added to the array of instance type price spreads. 
function addToSpotInstanceTypePriceSpread(name, min, max){
     var instanceTypeFound = false;
    for(var instanceCounter=0; instanceCounter < spotInstanceTypePriceSpread.length; instanceCounter++)
    {
        
        if(name === spotInstanceTypePriceSpread[instanceCounter].name)
        {
            instanceTypeFound = true;
            if(min < spotInstanceTypePriceSpread[instanceCounter].min)
            {
                spotInstanceTypePriceSpread[instanceCounter].min = min;
            }
            if(max > spotInstanceTypePriceSpread[instanceCounter].max)
            {
                spotInstanceTypePriceSpread[instanceCounter].max = max;
            }
            break;
        }
    }
    if(instanceTypeFound === false)
    {
        spotInstanceTypePriceSpread.push({name: name, min:min, max: max});
    }
}

//Function used to determine the top ten Instances based on the price per Vcpu for an Amazon OnDemand instance type ).

//If the top ten Instances array length is not 10, the instance is automatically added to the array
 
//If the length is 10, the existing array is sorted in ascending order based on the price per Vcpu attribute.
//The last element in the sorted array will be the highest price per Vcpu and the incoming instance data will be compared
//to replace it if it's price per Vcpu is cheaper.

function addToPricePerVcpuInstances(type, regionName, numberOfVcpus, price, pricePerVcpu)
{
    if(topTenPricePerVcpuInstances.length<10)
    {
        topTenPricePerVcpuInstances.push({instanceType:type, regionName:regionName, numberofVcpus:numberOfVcpus, price:price, pricePerVcpu:pricePerVcpu});
    }
    else
    {
        topTenPricePerVcpuInstances.sort(sortByPricePerVcpu);
        if(topTenPricePerVcpuInstances[9] > pricePerVcpu)
        {
            topTenPricePerVcpuInstances.pop();
            topTenPricePerVcpuInstances.push({instanceType:type, regionName:regionName, numberofVcpus:numberOfVcpus, price:price, pricePerVcpu:pricePerVcpu});
        }
       
    }
}

//Function used to display the project requirements to the html page and also displaying
//the current time on the html page.

//The UI library used in the html page is jQuery easyUI. As the name suggests, it
//is a library built on the jQuery library. The tables to display each project requirement
//are already declared in the html page. They are given an 'id' and are 'datagrid' easyUI widgets.

//The datagrids are updated by accessing the DOM through jquery and 'grabbing'
//them individually by their 'id' mentioned above. The specific columns and 
//the data needed for each table are then updated into each table.

//*The column data could have been set in html using <th>. It was done in this function
//just to practice doing it from javascript.

function displayData()
{
    topTenPricePerVcpuInstances.sort(sortByPricePerVcpu);
    regionAverages.sort(function(region1, region2){
        return region1.regionAverage - region2.regionAverage;
    });
    var cheapestRegionAverage = [];
    cheapestRegionAverage.push(regionAverages[0]);
    $('#onDemandInstanceTypeSpread').datagrid({columns:[[{field:'name', title:'Instance Type', width:100}, {field:'min', title:'Minimum price (' + odRate + ')', width:100}, {field:'max', align:'right', width:100, title:'Maximum price (' + odRate + ')'}]]});
    $('#onDemandInstanceTypeSpread').datagrid({data: odInstanceTypePriceSpread});
    $('#onDemandRegionTypeSpread').datagrid({columns:[[{field:'name', title:'Region', width:100}, {field:'min', title:'Minimum price (' + odRate + ')', width:100}, {field:'max', align:'right', width:100, title:'Maximum price (' + odRate + ')'}]]});
    $('#onDemandRegionTypeSpread').datagrid({data: odRegionPriceSpread});
    $('#spotInstanceTypeSpread').datagrid({columns:[[{field:'name', title:'Instance Type', width:100}, {field:'min', title:'Minimum price (' + spotRate + ')', width:100}, {field:'max', align:'right', width:100, title:'Maximum price (' + odRate + ')'}]]});
    $('#spotInstanceTypeSpread').datagrid({data: spotInstanceTypePriceSpread});
    $('#spotRegionSpread').datagrid({columns:[[{field:'name', title:'Region', width:100}, {field:'min', title:'Minimum price (' + spotRate + ')', width:100}, {field:'max', align:'right', width:100, title:'Maximum price (' + odRate + ')'}]]});
    $('#spotRegionSpread').datagrid({data: spotRegionPriceSpread});	
    $('#topOdTenInstancesPerVcpu').datagrid({columns:[[{field:'instanceType', title:'Instance Type', width:100}, {field:'regionName', title:'Region', width:100},
                {field:'price', title:'Price (per hr)', width:100}, {field:'numberofVcpus', title:'Number of Vcpus', width:100}, {field:'pricePerVcpu', title:'Price Per Vcpu'}]]});
    $('#topOdTenInstancesPerVcpu').datagrid({data:topTenPricePerVcpuInstances});
    $('#cheapestRegionOverall').datagrid({columns:[[{field:'name', title:'Region', width:100}, {field:'regionAverage', title:'Region Instance Price Average (per hr)', width:100}]]});
    $('#cheapestRegionOverall').datagrid({data:cheapestRegionAverage});
    
    var today = new Date();
    document.getElementById('time').innerHTML="Updated: " + today;
}


