public with sharing class SecurityUtil {
    
    public static List<SObject> sanitizeQueryResult(List<SObject> records){
        List<SObject> strippedRecords = Security.stripInaccessible(AccessType.READABLE, records).getRecords();
        return strippedRecords;
    }

    public static List<SObject> sanitizeForUpdate(List<SObject> records){
        List<SObject> strippedRecords = Security.stripInaccessible(AccessType.UPDATABLE, records).getRecords();
        return strippedRecords;
    }
}
