let users = [];
const activeUsers = (user) => {
    if (user?.disconnect) {
        return users.filter(email => email !== user?.disconnect);
    }
    else if (user?.connect) {
        if (!users.includes(user?.connect)) {
            users = [...users, user.connect]
        }
        return users;
    }
}

module.exports = {
    activeUsers
}