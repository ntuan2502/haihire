import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

type Actor = { id: string; headers: { Cookie: string } };

async function register(request: APIRequestContext): Promise<Actor> {
  const response = await request.post("/api/auth/register", {
    data: {
      firstName: "Ownership",
      lastName: "Transfer Test",
      email: `ownership-${randomUUID()}@example.com`,
      password: "OwnershipTransferTest2026!",
    },
  });
  expect(response.status()).toBe(201);
  const { accessToken, user } = (await response.json()) as {
    accessToken: string;
    user: { id: string };
  };
  return { id: user.id, headers: { Cookie: `haihire_token=${accessToken}` } };
}

async function createOrganization(request: APIRequestContext, owner: Actor) {
  const response = await request.post("/api/organizations", {
    headers: owner.headers,
    data: {
      name: "Ownership Transfer Test",
      slug: `ownership-${randomUUID()}`,
    },
  });
  expect(response.status()).toBe(201);
  const { organization } = (await response.json()) as {
    organization: { id: string };
  };
  return organization.id;
}

async function addMember(
  request: APIRequestContext,
  owner: Actor,
  member: Actor,
) {
  const invitation = await request.post("/api/organizations/my/invite-links", {
    headers: owner.headers,
    data: { role: "Member" },
  });
  expect(invitation.status()).toBe(201);
  const { token } = (await invitation.json()) as { token: string };

  const join = await request.post(
    `/api/organizations/invite-links/join/${token}`,
    {
      headers: member.headers,
    },
  );
  expect(join.status()).toBe(201);
}

test("transferring ownership preserves the new owner's role in their other active organization", async ({
  request,
}) => {
  const owner = await register(request);
  const otherOwner = await register(request);
  const recipient = await register(request);
  const organizationId = await createOrganization(request, owner);
  const otherOrganizationId = await createOrganization(request, otherOwner);
  await addMember(request, owner, recipient);
  await addMember(request, otherOwner, recipient);

  const transfer = await request.post(
    "/api/organizations/my/transfer-ownership",
    {
      headers: owner.headers,
      data: { newOwnerUserId: recipient.id },
    },
  );
  expect(transfer.status()).toBe(200);

  const activeProfile = await request.get("/api/auth/me", {
    headers: recipient.headers,
  });
  expect(await activeProfile.json()).toMatchObject({
    organizationId: otherOrganizationId,
    role: "MEMBER",
    isOwner: false,
  });

  const otherOrganizationInvite = await request.post(
    "/api/organizations/my/invite-links",
    { headers: recipient.headers, data: { role: "Member" } },
  );
  expect(otherOrganizationInvite.status()).toBe(403);

  const switched = await request.post("/api/organizations/switch", {
    headers: recipient.headers,
    data: { organizationId },
  });
  expect(switched.status()).toBe(200);
  expect(await switched.json()).toMatchObject({
    user: { role: "ADMIN", isOwner: true },
  });

  const formerOwner = await request.get("/api/auth/me", {
    headers: owner.headers,
  });
  expect(await formerOwner.json()).toMatchObject({
    organizationId,
    role: "ADMIN",
    isOwner: false,
  });
});

test("only one concurrent ownership transfer succeeds", async ({ request }) => {
  const owner = await register(request);
  const first = await register(request);
  const second = await register(request);
  await createOrganization(request, owner);
  await addMember(request, owner, first);
  await addMember(request, owner, second);

  const transfers = await Promise.all(
    [first, second].map((recipient) =>
      request.post("/api/organizations/my/transfer-ownership", {
        headers: owner.headers,
        data: { newOwnerUserId: recipient.id },
      }),
    ),
  );
  expect(transfers.map((response) => response.status()).sort()).toEqual([
    200, 403,
  ]);

  const loser = transfers[0].status() === 403 ? first : second;
  const profile = await request.get("/api/auth/me", { headers: loser.headers });
  expect(await profile.json()).toMatchObject({
    role: "MEMBER",
    isOwner: false,
  });

  const audit = await request.get(
    "/api/organizations/my/audit-log?action=OWNERSHIP_TRANSFERRED",
    {
      headers: owner.headers,
    },
  );
  expect(audit.status()).toBe(200);
  expect(await audit.json()).toMatchObject({ total: 1 });
});
