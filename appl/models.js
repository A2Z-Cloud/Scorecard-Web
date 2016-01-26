export class Provider {
    constructor({id: id, name: name, requirements: requirements}){
        this.id = id;
        this.name = name;
        this.requirements = requirements;
    }
}

export class Importance {
    constructor({id: id, project: project, sort_order: sort_order, requirement: requirement}){
        this.id = id;
        this.project = project;
        this.sort_order = sort_order;
        this.requirement = requirement;
    }
}

export class Score {
    constructor({id: id, score: score, provider: provider}){
        this.id = id;
        this.score = score;
        this.provider = provider;
    }
}

export class Requirement {
    constructor({id: id, name: name, unit: unit, project: project}){
        this.id = id;
        this.name = name;
        this.unit = unit
        this.project = project;
    }
}

export class Project {
    constructor({id: id, name: name}){
        this.id = id;
        this.name = name;
    }
}
