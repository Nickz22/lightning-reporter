public with sharing class PermissionSetAssignmentSelector {
    
    public PermissionSetAssignmentSelector() {}

    public List<PermissionSetAssignment> selectLightningReporterUsers(){
        List<PermissionSetAssignment> lexReporterUsers = [SELECT AssigneeId 
                                                            FROM PermissionSetAssignment 
                                                            WHERE PermissionSet.Name =: C.LIGHTNING_REPORTER_PERMISSION];   
        return SecurityUtil.sanitizeQueryResult(lexReporterUsers);
        
    }
}
