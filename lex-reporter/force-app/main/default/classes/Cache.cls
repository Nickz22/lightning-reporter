public with sharing class Cache {

    private static Map<String,Schema.SObjectType> cachedGlobalDescribe;
    public static Map<String,Schema.SObjectType> globalDescribe {
        get{
            if (cachedGlobalDescribe == null) {
                cachedGlobalDescribe = Schema.getGlobalDescribe();
            }
            return cachedGlobalDescribe;
        }   
    }
}
