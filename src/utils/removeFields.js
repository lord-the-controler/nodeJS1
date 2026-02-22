function remove(...fields) {
    return fields.map(field => `-${field}`).join(" ");
}

export { remove };
