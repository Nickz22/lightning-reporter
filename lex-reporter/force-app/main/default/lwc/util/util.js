
const getJsTime = apexTime => {
    debugger;
    // remove anything following the last '.' in apexTime
    apexTime = apexTime.substring(0, apexTime.lastIndexOf("."));
    // get content before "T" from apexTime
    let date = apexTime.substring(0, apexTime.indexOf("T"));
    // split apexTime into array of string separated by "T"
    let time = apexTime.split("T")[1];
    // split time into array of string separated by ":"
    let timeArray = time.split(":");
    let jsTime = new Date(date).setHours(timeArray[0], timeArray[1], timeArray[2], 0);
    // offset jstime by local timezone
    jsTime = jsTime + new Date().getTimezoneOffset() * 60000;
    return jsTime;
}

export {getJsTime};