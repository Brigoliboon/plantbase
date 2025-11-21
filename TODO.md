22/11/2025 - 3:09 AM
last progress:
- changed the orm for the sampling_location
    - types\index.ts
- simplified the coordinates instead of in PostGIS, just long & lat instead
    - deleted the coordinates attrib and replaced with long& lat
    - changed the post structure on the app\api\locations\route.ts
    - want to revert on the old data type
    - bring back the coordinates attrib with geography datatype
