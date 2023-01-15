global class ContextDTO {

    @AuraEnabled global List<SubjectDTO> subjects {get; set;}
    @AuraEnabled global List<NoteDTO> alerts {get; set;} 

    public ContextDTO(List<SubjectDTO> subjects, List<NoteDTO> alerts){
        this.subjects = subjects.isEmpty() ? new List<SubjectDTO>() : subjects;
        this.alerts = alerts;
    }
}