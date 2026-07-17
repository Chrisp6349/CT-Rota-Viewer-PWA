class ViewerUtils {

    static ordinal(n) {
        if (n % 10 === 1 && n !== 11) return n + "st";
        if (n % 10 === 2 && n !== 12) return n + "nd";
        if (n % 10 === 3 && n !== 13) return n + "rd";
        return n + "th";
    }

    static formatWeek(dateString) {

        const date = new Date(dateString);

        const months = [
            "January","February","March","April","May","June",
            "July","August","September","October","November","December"
        ];

        const days = [
            "Sunday","Monday","Tuesday","Wednesday",
            "Thursday","Friday","Saturday"
        ];

        return `${days[date.getDay()]} ${ViewerUtils.ordinal(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()}`;

    }

    static formatShortDate(date) {

        const d = new Date(date);

        return `${ViewerUtils.ordinal(d.getDate())}`;

    }

}
